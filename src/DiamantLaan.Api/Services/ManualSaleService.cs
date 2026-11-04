using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Validation;
using Microsoft.AspNetCore.Identity;

namespace DiamantLaan.Api.Services;

/// <summary>Who an admin is recording a sale for, exactly as typed on the form.</summary>
public record ManualBuyer(
    string Email,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string? PhoneCountryCode,
    bool IsOraniaResident,
    bool IsOraniaBewegingMember);

/// <summary>
/// The account a manual sale lands on. <see cref="TempPassword"/> is only set for a brand new
/// account and is what goes into its welcome email. <see cref="Error"/> is an Afrikaans message
/// for a 400, and when it is set nothing else is.
/// </summary>
public record ManualBuyerResult(User? User, bool IsNewUser, string? TempPassword, string? Error);

/// <summary>
/// The steps a telefoniese aankoop and a large donation share once the blocks are settled: find or
/// create the buyer, name the certificate, keep the proof of payment and send the one email. Both
/// run inside the caller's transaction, so none of this commits on its own.
/// </summary>
public class ManualSaleService
{
    public const string ProofMethodError = "Bewys van betaling geld net vir EFT-, Bitcoin- of PayPal-aankope.";

    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly IWebHostEnvironment _env;
    private readonly EmailOutboxService _emailOutbox;
    private readonly IConfiguration _config;
    // Optional for the same reason as on AdminController: without a signing key the emails just
    // go out without the switch-to-English footer link.
    private readonly LanguageLinkService? _languageLinks;

    public ManualSaleService(
        AppDbContext db,
        UserManager<User> userManager,
        IWebHostEnvironment env,
        EmailOutboxService emailOutbox,
        IConfiguration config,
        LanguageLinkService? languageLinks = null)
    {
        _db = db;
        _userManager = userManager;
        _env = env;
        _emailOutbox = emailOutbox;
        _config = config;
        _languageLinks = languageLinks;
    }

    public static bool AllowsProofOfPayment(string? paymentMethod) =>
        paymentMethod is "EFT" or "Bitcoin" or "PayPal";

    /// <summary>
    /// Finds the buyer by email and brings their details up to date, or creates them with a
    /// temporary password they must change on first sign-in. Whatever the admin typed wins: they
    /// have just spoken to the person.
    /// </summary>
    public async Task<ManualBuyerResult> UpsertBuyerAsync(ManualBuyer buyer)
    {
        if (!PhoneValidator.TryNormalize(buyer.PhoneNumber, buyer.PhoneCountryCode, out var e164, out var phoneError))
            return new ManualBuyerResult(null, false, null, phoneError);

        var phoneCountryCode = string.IsNullOrWhiteSpace(buyer.PhoneCountryCode) ? "+27" : buyer.PhoneCountryCode.Trim();
        var user = await _userManager.FindByEmailAsync(buyer.Email);
        if (user == null)
        {
            var tempPassword = TemporaryPasswordGenerator.Generate();
            user = new User
            {
                UserName = buyer.Email,
                Email = buyer.Email,
                FirstName = buyer.FirstName.Trim(),
                LastName = buyer.LastName.Trim(),
                PhoneNumber = string.IsNullOrEmpty(e164) ? null : e164,
                PhoneCountryCode = phoneCountryCode,
                IsOraniaResident = buyer.IsOraniaResident,
                IsOraniaBewegingMember = buyer.IsOraniaBewegingMember,
                EmailConfirmed = true,
                MustChangePassword = true,
                ReceiveBlockProgressEmails = true
            };
            var createResult = await _userManager.CreateAsync(user, tempPassword);
            if (!createResult.Succeeded)
                return new ManualBuyerResult(null, false, null, "Kon nie gebruiker skep nie.");
            await _userManager.AddToRoleAsync(user, "Buyer");
            return new ManualBuyerResult(user, true, tempPassword, null);
        }

        user.FirstName = buyer.FirstName.Trim();
        user.LastName = buyer.LastName.Trim();
        user.PhoneNumber = string.IsNullOrEmpty(e164) ? null : e164;
        user.PhoneCountryCode = phoneCountryCode;
        user.IsOraniaResident = buyer.IsOraniaResident;
        user.IsOraniaBewegingMember = buyer.IsOraniaBewegingMember;
        await _userManager.UpdateAsync(user);
        return new ManualBuyerResult(user, false, null, null);
    }

    /// <summary>
    /// Writes the certificate names the admin took down over the phone. The buyer would otherwise
    /// have to sign in inside the 15-minute window to set them, which nobody phoning an order does.
    /// Only the blocks on this order are touched: ones bought earlier keep the names they were
    /// issued under. The summary name and the individual/summary choice live on the account, so a
    /// returning buyer's answer on this call is the one that stands, exactly as on their own page.
    /// </summary>
    public static void ApplyCertificateNames(
        User user,
        IEnumerable<Square> squares,
        string? certificateName,
        bool individual,
        IReadOnlyDictionary<int, string>? blockNames = null)
    {
        var summaryName = string.IsNullOrWhiteSpace(certificateName)
            ? $"{user.FirstName} {user.LastName}".Trim()
            : certificateName.Trim();

        user.CertificateName = summaryName;
        user.CertificateIndividual = individual;

        if (!individual)
            return;

        foreach (var square in squares)
        {
            var name = blockNames != null && blockNames.TryGetValue(square.Id, out var typed) ? typed.Trim() : string.Empty;
            square.CertificateName = name.Length >= 2 ? name : summaryName;
        }
    }

    /// <summary>Stores the PDF next to the others as {purchaseId}.pdf. The purchase must already have its id.</summary>
    public async Task SaveProofAsync(Purchase purchase, IFormFile proofOfPayment)
    {
        var uploadsDir = FileUploadService.GetPrivateUploadsPath(_env);
        var fileName = $"{purchase.Id}.pdf";
        var filePath = Path.Combine(uploadsDir, fileName);
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await proofOfPayment.CopyToAsync(stream);
        }
        purchase.ProofOfPaymentPath = $"proofs/{fileName}";
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// The one email a manual sale sends. A brand new user needs the temporary password; an
    /// existing one just needs the same confirmation a PayFast buyer gets. Returns whether it went
    /// out at once; a false still leaves it in the outbox for the background retry, unless the
    /// account has no email at all.
    /// </summary>
    public async Task<bool> QueuePurchaseEmailAsync(User user, string? welcomeTempPassword, int squareCount, decimal amount)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
            return false;

        var siteUrl = AppPublicUrl.Resolve(_config);
        var en = user.Language == "en";
        var switchUrl = _languageLinks?.BuildUrl(user.Id, "en");
        var html = welcomeTempPassword != null
            ? EmailTemplates.ManualPurchaseWelcome(user.FirstName, user.Email, welcomeTempPassword, siteUrl, en, switchUrl)
            : EmailTemplates.AccountPurchaseConfirmation(user.FirstName, squareCount, amount, siteUrl, en, switchUrl);
        return await _emailOutbox.QueueAsync(
            user.Email,
            EmailTemplates.SubjectPrefix + EmailTemplates.T(en, "Jou borgskap is voltooi!", "Your sponsorship is complete!"),
            html);
    }
}
