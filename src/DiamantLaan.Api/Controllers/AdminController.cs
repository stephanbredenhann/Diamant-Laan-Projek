using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using DiamantLaan.Api.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly IWebHostEnvironment _env;
    private readonly AuditLogService _audit;
    private readonly SiteSettingsService _siteSettings;
    private readonly BlockNotificationService _blockNotifications;
    private readonly AdminSaveUndoService _saveUndo;
    private readonly EmailOutboxService _emailOutbox;
    private readonly IConfiguration _config;
    // Optional so a test can build the mailer without a signing key: without it the emails simply
    // go out without the switch-to-English footer link. Always supplied by DI in production.
    private readonly LanguageLinkService? _languageLinks;

    public AdminController(
        AppDbContext db,
        UserManager<User> userManager,
        IWebHostEnvironment env,
        AuditLogService audit,
        SiteSettingsService siteSettings,
        BlockNotificationService blockNotifications,
        AdminSaveUndoService saveUndo,
        EmailOutboxService emailOutbox,
        IConfiguration config,
        LanguageLinkService? languageLinks = null)
    {
        _db = db;
        _userManager = userManager;
        _env = env;
        _audit = audit;
        _siteSettings = siteSettings;
        _blockNotifications = blockNotifications;
        _saveUndo = saveUndo;
        _emailOutbox = emailOutbox;
        _config = config;
        _languageLinks = languageLinks;
    }

    [HttpPut("settings/home-stats")]
    public async Task<IActionResult> UpdateHomeStatsSettings([FromBody] UpdateHomeStatsSettingsDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Instellings mag nie leeg wees nie." });

        var result = await _siteSettings.UpdateHomeStatsSettingsAsync(dto);

        await _audit.LogAsync(
            User,
            "UpdateHomeStatsSettings",
            $"ShowStatsSection={result.ShowStatsSection}, ShowTotalRaised={result.ShowTotalRaised}");

        return Ok(result);
    }

    /// <summary>
    /// Where "Kies vir my" starts handing out blocks. Inclusive, 0 means the normal
    /// lowest-first assignment. Admin-only: nothing outside the admin panel reads it.
    /// </summary>
    [HttpGet("settings/kies-offset")]
    public async Task<IActionResult> GetKiesVirMyOffset()
        => Ok(await _siteSettings.GetKiesVirMyOffsetAsync());

    [HttpPut("settings/kies-offset")]
    public async Task<IActionResult> UpdateKiesVirMyOffset([FromBody] KiesVirMyOffsetDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Instellings mag nie leeg wees nie." });

        if (dto.Offset < 0 || dto.Offset > Square.MaxSaleableId)
            return BadRequest(new { message = $"Offset moet tussen 0 en {Square.MaxSaleableId} wees." });

        var result = await _siteSettings.SetKiesVirMyOffsetAsync(dto.Offset);

        await _audit.LogAsync(User, "UpdateKiesVirMyOffset", $"Offset={result.Offset}");

        return Ok(result);
    }

    [HttpPut("squares/status")]
    public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkStatusUpdateDto dto)
    {
        var squares = await _db.Squares
            .Where(s => dto.SquareIds.Contains(s.Id))
            .ToListAsync();

        if (squares.Count != dto.SquareIds.Count)
            return BadRequest(new { message = "Sommige blokke bestaan nie." });

        // Moving a status backwards is allowed on purpose: admins need to correct a block
        // that was marked too far ahead. Only forward jumps of more than one phase are blocked.
        foreach (var square in squares)
        {
            if ((int)dto.Status > (int)square.Status + 1)
                return BadRequest(new { message = $"Kan nie blok #{square.Id} van {square.Status} na {dto.Status} skuif nie." });
        }

        var statusChanges = squares
            .Select(s => new SquareStatusChange(s.Id, (int)s.Status))
            .ToList();
        var ownerIds = squares
            .Select(s => s.OwnerId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Cast<string>()
            .Distinct()
            .ToList();

        foreach (var square in squares)
            square.Status = dto.Status;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "BulkStatusUpdate", $"Updated {squares.Count} squares to {dto.Status}");

        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        await _saveUndo.BeginOrReplaceAsync(adminUserId, dto.UndoBatchId, statusChanges, ownerIds);
        await _blockNotifications.QueueOwnersAsync(squares.Select(s => s.OwnerId), dto.Status);

        return Ok(new { updated = squares.Count });
    }

    /// <summary>
    /// Holds blocks back from public sale, or releases them again. Reserved blocks stay
    /// sellable through ManualPurchase, which is the whole point of the flag.
    /// </summary>
    [HttpPut("squares/reserve")]
    public async Task<IActionResult> BulkReserve([FromBody] BulkReserveDto dto)
    {
        var squares = await _db.Squares
            .Where(s => dto.SquareIds.Contains(s.Id))
            .ToListAsync();

        if (squares.Count != dto.SquareIds.Distinct().Count())
            return BadRequest(new { message = "Sommige blokke bestaan nie." });

        if (dto.Reserved)
        {
            var sold = squares.Where(s => s.OwnerId != null).Select(s => s.Id).ToList();
            if (sold.Count > 0)
                return BadRequest(new
                {
                    message = $"Hierdie blokke is reeds verkoop en kan nie gereserveer word nie: {string.Join(", ", sold)}."
                });
        }

        foreach (var square in squares)
            square.IsReserved = dto.Reserved;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            User,
            dto.Reserved ? "ReserveSquares" : "UnreserveSquares",
            $"{squares.Count} squares: {string.Join(", ", squares.Select(s => s.Id))}");

        return Ok(new { updated = squares.Count });
    }

    [HttpGet("squares/undo-last")]
    public async Task<IActionResult> GetUndoLast()
    {
        var info = await _saveUndo.GetActiveAsync();
        return Ok(info);
    }

    [HttpPost("squares/undo-last")]
    public async Task<IActionResult> UndoLast()
    {
        var (success, errorMessage) = await _saveUndo.UndoActiveAsync();
        if (!success)
            return Conflict(new { message = errorMessage ?? "Kan nie ongedaan maak nie." });

        await _audit.LogAsync(User, "UndoLastSave", "Undid last admin square save");
        return Ok(new { message = "Laaste stoor is ongedaan gemaak." });
    }

    [HttpGet("purchases")]
    public async Task<IActionResult> GetPurchases()
    {
        var purchases = await _db.Purchases
            .Include(p => p.User)
            .Include(p => p.PurchaseSquares)
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync();

        var buyers = purchases
            .GroupBy(p => p.UserId)
            .Select(g =>
            {
                var user = g.First().User;
                var phone = FormatPhoneFields(user);
                var name = (user.FirstName + " " + user.LastName).Trim();
                return new
                {
                    UserId = g.Key,
                    // A guest buyer has no account, and often no name beyond what PayFast reported.
                    Name = user.IsGuest
                        ? (string.IsNullOrEmpty(name) ? "Gas (geen rekening)" : name + " (gas, geen rekening)")
                        : name,
                    Email = user.Email ?? g.Select(p => p.GuestEmail).FirstOrDefault(e => e != null),
                    phone.PhoneNumber,
                    phone.PhoneCountryCode,
                    phone.PhoneDisplay,
                    IsOraniaResident = user.IsOraniaResident,
                    IsOraniaBewegingMember = user.IsOraniaBewegingMember,
                    Squares = g.Sum(p => p.PurchaseSquares.Count),
                    TotalSpent = g.Sum(p => p.Amount)
                };
            })
            .OrderByDescending(b => b.TotalSpent)
            .ToList();

        return Ok(buyers);
    }

    /// <summary>
    /// Certificate data for admin download: the names as the buyer will see them printed, plus the
    /// blocks that user currently owns. A block carrying no name of its own prints the summary name,
    /// which is the same fallback <c>MySquaresController</c> applies on the buyer's own page.
    /// </summary>
    [HttpGet("users/{userId}/certificate-summary")]
    public async Task<IActionResult> GetCertificateSummary(string userId)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound(new { message = "Gebruiker nie gevind nie." });

        var accountName = (user.FirstName + " " + user.LastName).Trim();
        var ownerName = string.IsNullOrWhiteSpace(user.CertificateName) ? accountName : user.CertificateName;

        var owned = await _db.Squares
            .Where(s => s.OwnerId == userId)
            .Select(s => new { s.Id, s.CertificateName })
            .ToListAsync();

        var blockNames = owned.ToDictionary(s => s.Id, s => s.CertificateName);
        var ownedIds = owned.Select(s => s.Id).ToList();

        var boughtOn = await _db.PurchaseSquares
            .Where(ps => ownedIds.Contains(ps.SquareId))
            .Select(ps => new { ps.SquareId, ps.Purchase.PurchaseDate })
            .ToListAsync();

        var earliest = boughtOn
            .GroupBy(r => r.SquareId)
            .ToDictionary(g => g.Key, g => g.Min(r => r.PurchaseDate));

        var squares = ownedIds
            .OrderBy(id => id)
            .Select(id => new
            {
                Id = id,
                PurchaseDate = earliest.TryGetValue(id, out var date)
                    ? (DateTime?)date
                    : null,
                OwnerName = blockNames.TryGetValue(id, out var name) && !string.IsNullOrWhiteSpace(name)
                    ? name
                    : ownerName
            })
            .ToList();

        return Ok(new
        {
            OwnerName = ownerName,
            SameForAll = !user.CertificateIndividual,
            Squares = squares
        });
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions()
    {
        var purchases = await _db.Purchases
            .Include(p => p.User)
            .Include(p => p.PurchaseSquares)
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync();

        var transactions = purchases
            .Select(p => PurchaseTransactionMapper.ToDto(p, includeUser: true))
            .ToList();

        return Ok(transactions);
    }
    /// <summary>
    /// Permanently deletes a transaction, including a confirmed telefoniese aankoop, and hands its
    /// blocks back to the public pool. The admin re-enters their own password because there is no undo.
    /// </summary>
    [HttpPost("transactions/{id}/delete")]
    public async Task<IActionResult> DeleteTransaction(int id, [FromBody] DeleteTransactionDto dto)
    {
        var admin = await _userManager.GetUserAsync(User);
        if (admin == null || !await _userManager.CheckPasswordAsync(admin, dto.Password))
        {
            await _audit.LogAsync(User, "DeleteTransactionDenied", $"Purchase #{id}");
            // 403, not 401: a 401 sends the auth interceptor off to refresh the token and can log the admin out.
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Wagwoord is verkeerd." });
        }

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (purchase == null)
            return NotFound();

        var squareIds = purchase.PurchaseSquares.Select(ps => ps.SquareId).ToList();
        var details = $"Purchase #{purchase.Id}, {squareIds.Count} blokke, R{purchase.Amount:0}, {purchase.PaymentStatus}";

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var squares = await _db.Squares.Where(s => squareIds.Contains(s.Id)).ToListAsync();
            foreach (var square in squares)
            {
                // Only release what this buyer still owns: the block may since have been resold.
                if (square.OwnerId != purchase.UserId)
                    continue;

                square.OwnerId = null;
                square.CertificateName = null;
            }

            var proofPath = FileUploadService.ResolveProofFilePath(_env, purchase.ProofOfPaymentPath);

            // The PurchaseSquare rows cascade with the purchase.
            _db.Purchases.Remove(purchase);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            if (proofPath != null && System.IO.File.Exists(proofPath))
                System.IO.File.Delete(proofPath);
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return Conflict(new { message = "Die transaksie het intussen verander. Probeer weer." });
        }

        await _audit.LogAsync(User, "DeleteTransaction", details);

        return NoContent();
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        const int saleableSquares = 4000;
        var saleableQuery = _db.Squares.Where(s => s.Id >= 1 && s.Id <= saleableSquares);

        var total = await saleableQuery.CountAsync();
        var perStatus = await saleableQuery
            .GroupBy(s => s.Status)
            .Select(g => new { Status = (int)g.Key, Count = g.Count() })
            .ToListAsync();

        var klaarCount = perStatus.FirstOrDefault(x => x.Status == (int)SquareStatus.KlaarGeteer)?.Count ?? 0;
        var progress = total > 0 ? Math.Round((double)klaarCount / total * 100, 1) : 0;

        var soldCount = await saleableQuery.CountAsync(s => s.OwnerId != null);
        var totalRaised = await _db.Purchases
            .Where(p => p.PaymentStatus == PaymentStatus.Confirmed)
            .SumAsync(p => (double?)p.Amount) ?? 0;

        var confirmedPurchases = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .Include(p => p.User)
            .Where(p => p.PaymentStatus == PaymentStatus.Confirmed)
            .ToListAsync();

        // Group in memory: SQLite cannot always translate DateTime.Date in GroupBy.
        var dailySales = confirmedPurchases
            .GroupBy(p => p.PurchaseDate.Date)
            .Select(g => new
            {
                Date = g.Key,
                Amount = g.Sum(p => (double)p.Amount),
                Squares = g.Sum(p => p.PurchaseSquares.Count)
            })
            .OrderBy(g => g.Date)
            .ToList();

        const double sponsorBaseline = 2_000_000;
        var averageSpendPerBlock = soldCount > 0 ? Math.Round(totalRaised / soldCount, 2) : 0;

        var oraniaSquares = CountSquares(confirmedPurchases, u => u.IsOraniaResident);
        var outsiderSquares = CountSquares(confirmedPurchases, u => !u.IsOraniaResident);
        var bewegingSquares = CountSquares(confirmedPurchases, u => u.IsOraniaBewegingMember);
        var nonBewegingSquares = CountSquares(confirmedPurchases, u => !u.IsOraniaBewegingMember);

        return Ok(new
        {
            totalSquares = total,
            soldSquares = soldCount,
            progress,
            totalRaised,
            sponsorBaseline,
            averageSpendPerBlock,
            perStatus,
            dailySales,
            oraniaSquares,
            outsiderSquares,
            bewegingSquares,
            nonBewegingSquares
        });
    }

    private static int CountSquares(IEnumerable<Purchase> purchases, Func<User, bool> match) =>
        purchases.Where(p => p.User != null && match(p.User)).Sum(p => p.PurchaseSquares.Count);

    [HttpGet("registered-no-purchase")]
    public async Task<IActionResult> GetRegisteredNoPurchase()
    {
        var usersWithPurchases = await _db.Purchases
    .Where(p => p.PaymentStatus == PaymentStatus.Confirmed)
    .Select(p => p.UserId)
    .Distinct()
    .ToListAsync();

        var adminUserIds = await _db.UserRoles
            .Where(ur => _db.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Admin"))
            .Select(ur => ur.UserId)
            .ToListAsync();

        var users = await _db.Users
            .Where(u => !u.IsAnonymized && !u.IsGuest && !usersWithPurchases.Contains(u.Id) && !adminUserIds.Contains(u.Id))
            .OrderBy(u => u.Email)
            .ToListAsync();

        var result = users.Select(u =>
        {
            var phone = FormatPhoneFields(u);
            return new
            {
                u.Id,
                Name = u.FirstName + " " + u.LastName,
                u.Email,
                phone.PhoneNumber,
                phone.PhoneCountryCode,
                phone.PhoneDisplay,
                u.IsOraniaResident,
                u.IsOraniaBewegingMember
            };
        }).ToList();

        return Ok(result);
    }

    [HttpPost("users/make-admin")]
    public async Task<IActionResult> MakeAdmin([FromBody] MakeAdminDto dto)
    {
        var seedAdminEmail = _config["AdminUser:Email"];
        var callerEmail = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(seedAdminEmail)
            || !string.Equals(callerEmail, seedAdminEmail, StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
            return NotFound(new { message = "Gebruiker nie gevind nie." });

        if (await _userManager.IsInRoleAsync(user, "Admin"))
            return BadRequest(new { message = "Gebruiker is reeds ’n admin." });

        var result = await _userManager.AddToRoleAsync(user, "Admin");
        if (!result.Succeeded)
            return BadRequest(new { message = "Kon nie admin maak nie." });

        await _audit.LogAsync(User, "MakeAdmin", $"Promoted {dto.Email} to Admin");

        return Ok(new { message = $"{dto.Email} is nou ’n admin." });
    }

    [HttpPost("manual-purchase")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> ManualPurchase([FromForm] ManualPurchaseDto dto, IFormFile? proofOfPayment)
    {
        if (proofOfPayment != null && !FileUploadService.IsPdf(proofOfPayment))
            return BadRequest(new { message = "Bewys van betaling moet ’n geldige PDF wees." });

        if (proofOfPayment != null && !AllowsProofOfPayment(dto.PaymentMethod))
            return BadRequest(new { message = ProofMethodError });

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var squares = await _db.Squares
                .Where(s => dto.SquareIds.Contains(s.Id))
                .ToListAsync();

            if (squares.Count != dto.SquareIds.Count)
                return BadRequest(new { message = "Sommige blokke bestaan nie." });

            if (squares.Any(s => s.OwnerId != null))
                return BadRequest(new { message = "Sommige blokke is reeds verkoop." });

            if (squares.Any(s => s.Id < 1 || s.Id > 4000))
                return BadRequest(new { message = "Ongeldige blokke gekies." });

            var amount = squares.Count * 500m;

            if (!PhoneValidator.TryNormalize(dto.PhoneNumber, dto.PhoneCountryCode, out var e164, out var phoneError))
                return BadRequest(new { message = phoneError });

            var phoneCountryCode = string.IsNullOrWhiteSpace(dto.PhoneCountryCode) ? "+27" : dto.PhoneCountryCode.Trim();
            var user = await _userManager.FindByEmailAsync(dto.Email);
            string? welcomeTempPassword = null;
            var isNewUser = user == null;
            if (user == null)
            {
                welcomeTempPassword = TemporaryPasswordGenerator.Generate();
                user = new User
                {
                    UserName = dto.Email,
                    Email = dto.Email,
                    FirstName = dto.FirstName.Trim(),
                    LastName = dto.LastName.Trim(),
                    PhoneNumber = string.IsNullOrEmpty(e164) ? null : e164,
                    PhoneCountryCode = phoneCountryCode,
                    IsOraniaResident = dto.IsOraniaResident,
                    IsOraniaBewegingMember = dto.IsOraniaBewegingMember,
                    EmailConfirmed = true,
                    MustChangePassword = true,
                    ReceiveBlockProgressEmails = true
                };
                var createResult = await _userManager.CreateAsync(user, welcomeTempPassword);
                if (!createResult.Succeeded)
                    return BadRequest(new { message = "Kon nie gebruiker skep nie." });
                await _userManager.AddToRoleAsync(user, "Buyer");
            }
            else
            {
                user.FirstName = dto.FirstName.Trim();
                user.LastName = dto.LastName.Trim();
                user.PhoneNumber = string.IsNullOrEmpty(e164) ? null : e164;
                user.PhoneCountryCode = phoneCountryCode;
                user.IsOraniaResident = dto.IsOraniaResident;
                user.IsOraniaBewegingMember = dto.IsOraniaBewegingMember;
                await _userManager.UpdateAsync(user);
            }

            var purchase = new Purchase
            {
                UserId = user.Id,
                Amount = amount,
                PaymentStatus = PaymentStatus.Confirmed,
                ConfirmedAt = DateTime.UtcNow,
                PaymentMethod = dto.PaymentMethod
            };

            foreach (var square in squares)
            {
                square.OwnerId = user.Id;
                purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = square.Id });
            }

            ApplyCertificateNames(dto, user, squares);

            _db.Purchases.Add(purchase);
            await _db.SaveChangesAsync();

            if (proofOfPayment != null)
            {
                var uploadsDir = FileUploadService.GetPrivateUploadsPath(_env);
                var fileName = $"{purchase.Id}.pdf";
                var filePath = Path.Combine(uploadsDir, fileName);
                await using var stream = new FileStream(filePath, FileMode.Create);
                await proofOfPayment.CopyToAsync(stream);
                purchase.ProofOfPaymentPath = $"proofs/{fileName}";
                await _db.SaveChangesAsync();
            }

            await transaction.CommitAsync();
            await _audit.LogAsync(User, "ManualPurchase", $"Purchase #{purchase.Id} for {dto.Email}, {squares.Count} squares");

            var welcomeEmailSent = false;
            if (!string.IsNullOrWhiteSpace(user.Email))
            {
                var siteUrl = AppPublicUrl.Resolve(_config);
                // A brand new user needs the temporary password; an existing one just needs the
                // same confirmation a PayFast buyer gets.
                var en = user.Language == "en";
                var switchUrl = _languageLinks?.BuildUrl(user.Id, "en");
                var html = isNewUser && welcomeTempPassword != null
                    ? EmailTemplates.ManualPurchaseWelcome(user.FirstName, user.Email, welcomeTempPassword, siteUrl, en, switchUrl)
                    : EmailTemplates.AccountPurchaseConfirmation(user.FirstName, squares.Count, purchase.Amount, siteUrl, en, switchUrl);
                welcomeEmailSent = await _emailOutbox.QueueAsync(
                    user.Email,
                    EmailTemplates.SubjectPrefix + EmailTemplates.T(en, "Jou borgskap is voltooi!", "Your sponsorship is complete!"),
                    html);
            }

            return Ok(new
            {
                purchaseId = purchase.Id,
                amount = purchase.Amount,
                squareCount = squares.Count,
                userId = user.Id,
                paymentStatus = purchase.PaymentStatus.ToString(),
                hasProof = purchase.ProofOfPaymentPath != null,
                welcomeEmailSent
            });
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return Conflict(new { message = "Sommige blokke is intussen deur iemand anders gekoop." });
        }
    }

    /// <summary>
    /// Writes the certificate names the admin took down over the phone. The buyer would otherwise
    /// have to sign in inside the 15-minute window to set them, which nobody phoning an order does.
    /// Only the blocks on this order are touched: ones bought earlier keep the names they were
    /// issued under. The summary name and the individual/summary choice live on the account, so a
    /// returning buyer's answer on this call is the one that stands, exactly as on their own page.
    /// </summary>
    private static void ApplyCertificateNames(ManualPurchaseDto dto, User user, List<Square> squares)
    {
        var summaryName = string.IsNullOrWhiteSpace(dto.CertificateName)
            ? $"{user.FirstName} {user.LastName}".Trim()
            : dto.CertificateName.Trim();

        user.CertificateName = summaryName;
        user.CertificateIndividual = dto.CertificateIndividual;

        if (!dto.CertificateIndividual)
            return;

        foreach (var square in squares)
        {
            var name = dto.CertificateNames.TryGetValue(square.Id, out var typed) ? typed.Trim() : string.Empty;
            square.CertificateName = name.Length >= 2 ? name : summaryName;
        }
    }

    private const long MaxProofOfPaymentBytes = 10 * 1024 * 1024;

    private const string ProofMethodError = "Bewys van betaling geld net vir EFT-, Bitcoin- of PayPal-aankope.";

    private static bool AllowsProofOfPayment(string? paymentMethod) =>
        paymentMethod is "EFT" or "Bitcoin" or "PayPal";

    [HttpGet("purchases/{id}/proof")]
    public async Task<IActionResult> GetProofOfPayment(int id)
    {
        var purchase = await _db.Purchases.FindAsync(id);
        if (purchase == null || string.IsNullOrEmpty(purchase.ProofOfPaymentPath))
            return NotFound();

        var filePath = FileUploadService.ResolveProofFilePath(_env, purchase.ProofOfPaymentPath);
        if (filePath == null || !System.IO.File.Exists(filePath))
            return NotFound();

        return PhysicalFile(filePath, "application/pdf", $"bewys-{id}.pdf");
    }

    [HttpPost("purchases/{id}/proof")]
    public async Task<IActionResult> UploadProofOfPayment(int id, IFormFile? proofOfPayment)
    {
        if (proofOfPayment == null)
            return BadRequest(new { message = "Bewys van betaling is nodig." });

        if (proofOfPayment.Length > MaxProofOfPaymentBytes)
            return BadRequest(new { message = "Bewys van betaling mag nie groter as 10 MB wees nie." });

        if (!FileUploadService.IsPdf(proofOfPayment))
            return BadRequest(new { message = "Bewys van betaling moet ’n geldige PDF wees." });

        var purchase = await _db.Purchases.FindAsync(id);
        if (purchase == null)
            return NotFound();

        if (!PurchaseTransactionMapper.IsTelefonieseAankoop(purchase))
            return BadRequest(new { message = "Bewys van betaling kan net vir telefoniese aankope gestoor word." });

        if (!AllowsProofOfPayment(purchase.PaymentMethod))
            return BadRequest(new { message = ProofMethodError });

        var uploadsDir = FileUploadService.GetPrivateUploadsPath(_env);
        var fileName = $"{purchase.Id}.pdf";
        var filePath = Path.Combine(uploadsDir, fileName);
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await proofOfPayment.CopyToAsync(stream);
        }

        purchase.ProofOfPaymentPath = $"proofs/{fileName}";
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "UploadProofOfPayment", $"Purchase #{purchase.Id}");

        return Ok(new { hasProof = true });
    }

    [HttpDelete("purchases/{id}/proof")]
    public async Task<IActionResult> DeleteProofOfPayment(int id)
    {
        var purchase = await _db.Purchases.FindAsync(id);
        if (purchase == null || string.IsNullOrEmpty(purchase.ProofOfPaymentPath))
            return NotFound();

        if (!PurchaseTransactionMapper.IsTelefonieseAankoop(purchase))
            return BadRequest(new { message = "Bewys van betaling kan net vir telefoniese aankope verwyder word." });

        var filePath = FileUploadService.ResolveProofFilePath(_env, purchase.ProofOfPaymentPath);
        if (filePath != null && System.IO.File.Exists(filePath))
            System.IO.File.Delete(filePath);

        purchase.ProofOfPaymentPath = null;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "DeleteProofOfPayment", $"Purchase #{purchase.Id}");

        return Ok(new { hasProof = false });
    }

    [HttpGet("squares/images")]
    public async Task<IActionResult> GetProgressImages()
    {
        var images = await _db.ProgressImages
            .Include(pi => pi.ProgressImageSquares)
            .OrderByDescending(pi => pi.CreatedAt)
            .ToListAsync();

        return Ok(images.Select(pi => new AdminProgressImageDto
        {
            Id = pi.Id,
            Status = (int)pi.Status,
            Caption = pi.Caption,
            CreatedAt = pi.CreatedAt,
            SquareIds = pi.ProgressImageSquares.Select(pis => pis.SquareId).OrderBy(id => id).ToList()
        }));
    }

    [HttpGet("squares/images/conflicts")]
    public async Task<IActionResult> GetImageConflicts([FromQuery] List<int> squareIds, [FromQuery] SquareStatus status)
    {
        if (squareIds == null || squareIds.Count == 0)
            return BadRequest(new { message = "Geen blokke gekies nie." });

        var distinctIds = squareIds.Distinct().ToList();
        var conflictingSquareIds = await GetConflictingSquareIdsAsync(distinctIds, status);

        return Ok(new
        {
            conflictingSquareIds,
            totalSelected = distinctIds.Count
        });
    }

    [HttpPost("squares/images")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<IActionResult> UploadProgressImage([FromForm] ProgressImageUploadDto dto, IFormFile image)
    {
        if (image == null || image.Length == 0)
            return BadRequest(new { message = "Geen foto opgelaai nie." });

        if (!FileUploadService.IsImage(image))
            return BadRequest(new { message = "Foto moet ’n geldige JPEG, PNG of WebP wees." });

        var squareIds = dto.SquareIds.Distinct().ToList();
        var conflictingIds = await GetConflictingSquareIdsAsync(squareIds, dto.Status);
        var replacedCount = 0;
        var skippedCount = 0;
        var replacedImages = new List<ReplacedImageInfo>();

        if (dto.ReplaceExisting)
        {
            (replacedCount, replacedImages) = await _saveUndo.CaptureAndUnlinkImagesAsync(squareIds, dto.Status);
        }
        else
        {
            skippedCount = conflictingIds.Count;
            squareIds = squareIds.Except(conflictingIds).ToList();
            if (squareIds.Count == 0)
                return BadRequest(new { message = "Alle gekose blokke het reeds ’n foto vir hierdie status." });
        }

        var squares = await _db.Squares
            .Where(s => squareIds.Contains(s.Id))
            .ToListAsync();

        if (squares.Count != squareIds.Count)
            return BadRequest(new { message = "Sommige blokke bestaan nie." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var extension = FileUploadService.GetImageExtension(image.ContentType);

        var progressImage = new ProgressImage
        {
            Status = dto.Status,
            Caption = string.IsNullOrWhiteSpace(dto.Caption) ? null : dto.Caption.Trim(),
            UploadedByUserId = userId
        };

        foreach (var square in squares)
        {
            progressImage.ProgressImageSquares.Add(new ProgressImageSquare { SquareId = square.Id });
        }

        _db.ProgressImages.Add(progressImage);
        await _db.SaveChangesAsync();

        var uploadsDir = FileUploadService.GetProgressUploadsPath(_env);
        var fileName = $"{progressImage.Id}{extension}";
        var filePath = Path.Combine(uploadsDir, fileName);
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await image.CopyToAsync(stream);
        }

        progressImage.FilePath = $"progress/{fileName}";
        await _db.SaveChangesAsync();

        await _saveUndo.MergeImageAsync(userId, dto.UndoBatchId, progressImage.Id, replacedImages);

        await _audit.LogAsync(User, "UploadProgressImage", $"Image #{progressImage.Id} for {squares.Count} squares at status {dto.Status}");

        return Ok(new
        {
            id = progressImage.Id,
            status = (int)progressImage.Status,
            squareCount = squares.Count,
            caption = progressImage.Caption,
            replacedCount,
            skippedCount
        });
    }

    [HttpPut("squares/images/{id}")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<IActionResult> ReplaceProgressImage(int id, IFormFile image)
    {
        if (image == null || image.Length == 0)
            return BadRequest(new { message = "Geen foto opgelaai nie." });

        if (!FileUploadService.IsImage(image))
            return BadRequest(new { message = "Foto moet ’n geldige JPEG, PNG of WebP wees." });

        var progressImage = await _db.ProgressImages.FindAsync(id);
        if (progressImage == null)
            return NotFound();

        var oldPath = FileUploadService.ResolveProgressFilePath(_env, progressImage.FilePath);
        if (oldPath != null && System.IO.File.Exists(oldPath))
            System.IO.File.Delete(oldPath);

        var extension = FileUploadService.GetImageExtension(image.ContentType);
        var uploadsDir = FileUploadService.GetProgressUploadsPath(_env);
        var fileName = $"{progressImage.Id}{extension}";
        var filePath = Path.Combine(uploadsDir, fileName);
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await image.CopyToAsync(stream);
        }

        progressImage.FilePath = $"progress/{fileName}";
        await _db.SaveChangesAsync();

        await _audit.LogAsync(User, "ReplaceProgressImage", $"Replaced image #{id}");

        return Ok(new { id = progressImage.Id, message = "Foto vervang." });
    }

    [HttpDelete("squares/images/{id}")]
    public async Task<IActionResult> DeleteProgressImage(int id)
    {
        var progressImage = await _db.ProgressImages
            .Include(pi => pi.ProgressImageSquares)
            .FirstOrDefaultAsync(pi => pi.Id == id);

        if (progressImage == null)
            return NotFound();

        await DeleteProgressImageRecordAsync(progressImage);

        await _audit.LogAsync(User, "DeleteProgressImage", $"Deleted image #{id}");

        return Ok(new { message = "Foto verwyder." });
    }

    private static (string? PhoneNumber, string PhoneCountryCode, string? PhoneDisplay) FormatPhoneFields(User user)
    {
        var (countryCode, local) = PhoneValidator.SplitE164(user.PhoneNumber, user.PhoneCountryCode);
        if (string.IsNullOrWhiteSpace(local))
            return (null, countryCode, null);

        var display = $"{countryCode} {local}";
        return (local, countryCode, display);
    }

    private async Task<List<int>> GetConflictingSquareIdsAsync(List<int> squareIds, SquareStatus status)
    {
        return await _db.ProgressImageSquares
            .Where(pis => squareIds.Contains(pis.SquareId) && pis.ProgressImage.Status == status)
            .Select(pis => pis.SquareId)
            .Distinct()
            .ToListAsync();
    }

    private async Task<int> RemoveExistingImageLinksAsync(List<int> squareIds, SquareStatus status)
    {
        var links = await _db.ProgressImageSquares
            .Include(pis => pis.ProgressImage)
            .Where(pis => squareIds.Contains(pis.SquareId) && pis.ProgressImage.Status == status)
            .ToListAsync();

        if (links.Count == 0)
            return 0;

        var affectedSquareIds = links.Select(l => l.SquareId).Distinct().ToList();
        var affectedImageIds = links.Select(l => l.ProgressImageId).Distinct().ToList();

        _db.ProgressImageSquares.RemoveRange(links);
        await _db.SaveChangesAsync();

        foreach (var imageId in affectedImageIds)
        {
            var hasLinks = await _db.ProgressImageSquares.AnyAsync(pis => pis.ProgressImageId == imageId);
            if (!hasLinks)
            {
                var orphan = await _db.ProgressImages.FindAsync(imageId);
                if (orphan != null)
                    await DeleteProgressImageRecordAsync(orphan);
            }
        }

        return affectedSquareIds.Count;
    }

    private Task DeleteProgressImageRecordAsync(ProgressImage progressImage)
    {
        var filePath = FileUploadService.ResolveProgressFilePath(_env, progressImage.FilePath);
        if (filePath != null && System.IO.File.Exists(filePath))
            System.IO.File.Delete(filePath);

        _db.ProgressImages.Remove(progressImage);
        return _db.SaveChangesAsync();
    }

    [HttpGet("diagnostics")]
    public IActionResult GetDiagnostics()
    {
        var mandrill = _config.GetSection("Mandrill").Get<MandrillSettings>() ?? new MandrillSettings();
        var emailConfigured = !string.IsNullOrWhiteSpace(mandrill.ApiKey)
            && !string.IsNullOrWhiteSpace(mandrill.FromEmail);

        var pendingEmails = _db.PendingEmails.Count(e => !e.Sent);
        var pendingBlockNotifications = _db.PendingBlockNotifications.Count(p => !p.Sent);

        return Ok(new
        {
            email = new
            {
                configured = emailConfigured,
                fromEmailSet = !string.IsNullOrWhiteSpace(mandrill.FromEmail),
                apiKeySet = !string.IsNullOrWhiteSpace(mandrill.ApiKey),
                pendingOutboxCount = pendingEmails
            },
            notifications = new
            {
                pendingBlockNotificationCount = pendingBlockNotifications
            }
        });
    }
}
