using System.Text;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPayFastService _payFastService;
    private readonly ILogger<PaymentController> _logger;
#if DEBUG
    private readonly IWebHostEnvironment _environment;
#endif
    private readonly GuestPurchaseService _guests;
    private readonly EmailOutboxService _emails;
    private readonly IConfiguration _config;
    // Optional so a test can build the mailer without a signing key: without it the emails simply
    // go out without the switch-to-English footer link. Always supplied by DI in production.
    private readonly LanguageLinkService? _languageLinks;

    public PaymentController(
        AppDbContext db,
        IPayFastService payFastService,
        ILogger<PaymentController> logger,
        IWebHostEnvironment environment,
        GuestPurchaseService guests,
        EmailOutboxService emails,
        IConfiguration config,
        LanguageLinkService? languageLinks = null)
    {
        _db = db;
        _payFastService = payFastService;
        _logger = logger;
#if DEBUG
        _environment = environment;
#endif
        _guests = guests;
        _emails = emails;
        _config = config;
        _languageLinks = languageLinks;
    }

    [AllowAnonymous]
    [HttpPost("itn")]
    public async Task<IActionResult> Itn()
    {
        _logger.LogInformation(
            "PayFast ITN request received on {Scheme}://{Host}{Path}",
            Request.Scheme, Request.Host, Request.Path);

        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var rawBody = await reader.ReadToEndAsync();

        var merchantPaymentId = ExtractMerchantPaymentId(rawBody);
        var pfPaymentId = ExtractValue(rawBody, "pf_payment_id");
        var paymentStatus = ExtractValue(rawBody, "payment_status");

        _logger.LogInformation(
            "PayFast ITN received for m_payment_id={MerchantPaymentId}, pf_payment_id={PfPaymentId}, payment_status={PaymentStatus}",
            merchantPaymentId, pfPaymentId, paymentStatus);

        if (string.IsNullOrEmpty(merchantPaymentId) || !int.TryParse(merchantPaymentId, out var purchaseId))
        {
            _logger.LogWarning("PayFast ITN missing merchant payment id");
            return Ok("OK");
        }

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .FirstOrDefaultAsync(p => p.Id == purchaseId);

        if (purchase == null)
        {
            _logger.LogWarning("PayFast ITN for unknown purchase {PurchaseId}", purchaseId);
            return Ok("OK");
        }

        var result = await _payFastService.VerifyItnAsync(rawBody, purchase.Amount);

        if (!result.IsValid)
        {
            _logger.LogWarning("PayFast ITN validation failed for purchase {PurchaseId}: {Error}", purchaseId, result.Error);
            return Ok("OK");
        }

        await CaptureGuestPayerDetailsAsync(purchase, rawBody);

        var (ok, justConfirmed) = await ConfirmPurchaseAsync(purchase, result.PayFastPaymentId!, result.PaymentStatus!);
        if (!ok)
        {
            _logger.LogError(
                "PayFast ITN confirmation failed for purchase {PurchaseId}; returning 500 so PayFast will retry",
                purchaseId);
            return StatusCode(StatusCodes.Status500InternalServerError, "Confirmation failed");
        }

        await SendConfirmationEmailAsync(purchase, justConfirmed);

        return Ok("OK");
    }

#if DEBUG
    /// <summary>
    /// Development-only endpoint to simulate a PayFast ITN callback. It confirms a purchase from an
    /// anonymous, unvalidated purchase id, bypassing signature, amount and postback checks entirely,
    /// so on a public money site a runtime environment check is the wrong control: one app setting
    /// (ASPNETCORE_ENVIRONMENT=Development) would turn it on and hand out free blocks. Compiled out
    /// of Release builds instead, so it cannot exist in what gets published.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("simulate-itn")]
    public async Task<IActionResult> SimulateItn([FromBody] SimulateItnDto dto)
    {
        if (!_environment.IsDevelopment())
            return NotFound();

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .FirstOrDefaultAsync(p => p.Id == dto.PurchaseId);

        if (purchase == null)
            return NotFound(new { message = "Aankoop nie gevind nie." });

        if (purchase.PaymentStatus != PaymentStatus.Pending)
            return BadRequest(new { message = "Aankoop is nie meer hangend nie." });

        var (ok, justConfirmed) = await ConfirmPurchaseAsync(purchase, dto.PaymentId ?? $"sandbox-{purchase.Id}", dto.Status);
        if (!ok)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Kon nie aankoop bevestig nie." });

        await SendConfirmationEmailAsync(purchase, justConfirmed);

        return Ok(new { purchaseId = purchase.Id, paymentStatus = purchase.PaymentStatus.ToString() });
    }
#endif

    /// <summary>
    /// Every confirmed purchase gets exactly one confirmation email: a guest gets the version with a
    /// claim link, a registered buyer gets the version that just points at their account.
    /// </summary>
    private async Task SendConfirmationEmailAsync(Purchase purchase, bool justConfirmed)
    {
        if (purchase.GuestTokenHash != null)
        {
            await SendGuestClaimEmailAsync(purchase);
            return;
        }

        if (!justConfirmed || purchase.PaymentStatus != PaymentStatus.Confirmed)
            return;

        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == purchase.UserId);
            if (user == null || user.IsAnonymized || string.IsNullOrWhiteSpace(user.Email))
                return;

            var en = user.Language == "en";
            var siteUrl = AppPublicUrl.Resolve(_config);
            await _emails.QueueAsync(
                user.Email,
                EmailTemplates.SubjectPrefix + EmailTemplates.T(en, "Jou borgskap is voltooi!", "Your sponsorship is complete!"),
                EmailTemplates.AccountPurchaseConfirmation(
                    user.FirstName,
                    purchase.PurchaseSquares.Count,
                    purchase.Amount,
                    siteUrl,
                    en,
                    _languageLinks?.BuildUrl(user.Id, "en")));
        }
        catch (Exception ex)
        {
            // The payment is already confirmed; a failed email must not make PayFast retry the ITN.
            _logger.LogError(ex, "Could not send confirmation email for purchase {PurchaseId}", purchase.Id);
        }
    }

    /// <summary>
    /// Sends the guest who left us an email address one message with a link that can still turn
    /// their purchase into an account later. Issuing the token marks the email as sent, so a
    /// repeated ITN never produces a second one.
    /// </summary>
    private async Task SendGuestClaimEmailAsync(Purchase purchase)
    {
        if (purchase.GuestTokenHash == null || string.IsNullOrWhiteSpace(purchase.GuestEmail))
            return;

        if (purchase.PaymentStatus != PaymentStatus.Confirmed || purchase.ClaimEmailSentAt != null)
            return;

        try
        {
            var token = await _guests.IssueClaimTokenAsync(purchase);
            if (token == null)
                return;

            var siteUrl = AppPublicUrl.Resolve(_config).TrimEnd('/');
            var claimUrl = $"{siteUrl}/betalings/klaar?aankoop={purchase.Id}&sleutel={Uri.EscapeDataString(token)}";

            // A guest has never been asked, so their placeholder account still says Afrikaans. The
            // switch link works all the same: it targets the placeholder the claim would turn into
            // their real account, so a switch made before claiming survives the claim.
            var en = purchase.User?.Language == "en";
            await _emails.QueueAsync(
                purchase.GuestEmail,
                EmailTemplates.SubjectPrefix + EmailTemplates.T(en, "Jou borgskap is voltooi!", "Your sponsorship is complete!"),
                EmailTemplates.GuestPurchaseClaim(
                    purchase.PurchaseSquares.Count,
                    purchase.Amount,
                    claimUrl,
                    (int)GuestPurchaseService.ClaimTokenLifetime.TotalDays,
                    en,
                    _languageLinks?.BuildUrl(purchase.UserId, "en")));
        }
        catch (Exception ex)
        {
            // The payment is already confirmed; a failed email must not make PayFast retry the ITN.
            _logger.LogError(ex, "Could not send claim email for guest purchase {PurchaseId}", purchase.Id);
        }
    }

    /// <summary>
    /// A guest gives us nothing before checkout unless they volunteer an email, but PayFast collects
    /// the payer's name and email anyway and echoes them back on the ITN. Keeping them makes the
    /// purchase claimable later and gives the certificate a name to fall back on.
    /// </summary>
    private async Task CaptureGuestPayerDetailsAsync(Purchase purchase, string rawBody)
    {
        if (purchase.GuestTokenHash == null)
            return;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == purchase.UserId);
        if (user == null || !user.IsGuest)
            return;

        var firstName = ExtractValue(rawBody, "name_first");
        var lastName = ExtractValue(rawBody, "name_last");
        var email = ExtractValue(rawBody, "email_address");

        if (string.IsNullOrWhiteSpace(user.FirstName) && !string.IsNullOrWhiteSpace(firstName))
            user.FirstName = firstName.Trim();

        if (string.IsNullOrWhiteSpace(user.LastName) && !string.IsNullOrWhiteSpace(lastName))
            user.LastName = lastName.Trim();

        if (string.IsNullOrWhiteSpace(purchase.GuestEmail) && !string.IsNullOrWhiteSpace(email))
            purchase.GuestEmail = email.Trim();

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Never let this block confirmation, because the payment itself is what matters.
            _logger.LogWarning(ex, "Could not store payer details for guest purchase {PurchaseId}", purchase.Id);
        }
    }

    /// <summary>
    /// Confirms a pending purchase. <c>JustConfirmed</c> is only true for the call that actually made
    /// the transition, which is what keeps a retried ITN from emailing the buyer a second time.
    /// </summary>
    private async Task<(bool Ok, bool JustConfirmed)> ConfirmPurchaseAsync(Purchase purchase, string payFastPaymentId, string paymentStatus)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            await _db.Entry(purchase).ReloadAsync();

            if (purchase.PaymentStatus != PaymentStatus.Pending)
            {
                _logger.LogInformation("PayFast ITN for non-pending purchase {PurchaseId}", purchase.Id);
                await transaction.RollbackAsync();
                return (true, false);
            }

            purchase.PaymentStatus = PaymentStatus.Confirmed;
            purchase.PayFastPaymentId = payFastPaymentId;
            purchase.PayFastPaymentStatus = paymentStatus;
            purchase.ConfirmedAt = DateTime.UtcNow;

            var userId = purchase.UserId;
            foreach (var ps in purchase.PurchaseSquares)
            {
                var square = await _db.Squares.FindAsync(ps.SquareId);
                if (square != null)
                    square.OwnerId = userId;
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            _logger.LogInformation("Purchase {PurchaseId} confirmed", purchase.Id);
            return (true, true);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogWarning(ex, "Concurrency conflict confirming purchase {PurchaseId}", purchase.Id);
            return (false, false);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error confirming purchase {PurchaseId}", purchase.Id);
            return (false, false);
        }
    }

    private static string? ExtractMerchantPaymentId(string rawBody) => ExtractValue(rawBody, "m_payment_id");

    private static string? ExtractValue(string rawBody, string key)
    {
        foreach (var part in rawBody.Split('&'))
        {
            var idx = part.IndexOf('=');
            if (idx < 0) continue;
            var partKey = part[..idx];
            if (partKey.Equals(key, StringComparison.OrdinalIgnoreCase))
                return Uri.UnescapeDataString(part[(idx + 1)..]);
        }
        return null;
    }
}
