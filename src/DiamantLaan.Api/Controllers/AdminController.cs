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
    private readonly EmailOutboxService _emailOutbox;
    private readonly IConfiguration _config;

    public AdminController(
        AppDbContext db,
        UserManager<User> userManager,
        IWebHostEnvironment env,
        AuditLogService audit,
        SiteSettingsService siteSettings,
        BlockNotificationService blockNotifications,
        EmailOutboxService emailOutbox,
        IConfiguration config)
    {
        _db = db;
        _userManager = userManager;
        _env = env;
        _audit = audit;
        _siteSettings = siteSettings;
        _blockNotifications = blockNotifications;
        _emailOutbox = emailOutbox;
        _config = config;
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

    [HttpPut("squares/status")]
    public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkStatusUpdateDto dto)
    {
        var squares = await _db.Squares
            .Where(s => dto.SquareIds.Contains(s.Id))
            .ToListAsync();

        if (squares.Count != dto.SquareIds.Count)
            return BadRequest(new { message = "Sommige blokke bestaan nie." });

        foreach (var square in squares)
        {
            if (square.Status == SquareStatus.KlaarGeteer && dto.Status != SquareStatus.KlaarGeteer)
                return BadRequest(new { message = $"Blok #{square.Id} is reeds klaar geteer." });
            if ((int)dto.Status > (int)square.Status + 1)
                return BadRequest(new { message = $"Kan nie blok #{square.Id} van {square.Status} na {dto.Status} skuif nie." });

            square.Status = dto.Status;
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "BulkStatusUpdate", $"Updated {squares.Count} squares to {dto.Status}");
        await _blockNotifications.QueueOwnersAsync(squares.Select(s => s.OwnerId));

        return Ok(new { updated = squares.Count });
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
                return new
                {
                    UserId = g.Key,
                    Name = user.FirstName + " " + user.LastName,
                    Email = user.Email,
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

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        const int saleableSquares = 4200;
        var saleableQuery = _db.Squares.Where(s => s.Id >= 1 && s.Id <= saleableSquares);

        var total = await saleableQuery.CountAsync();
        var perStatus = await saleableQuery
            .GroupBy(s => s.Status)
            .Select(g => new { Status = (int)g.Key, Count = g.Count() })
            .ToListAsync();

        var klaarCount = perStatus.FirstOrDefault(x => x.Status == (int)SquareStatus.KlaarGeteer)?.Count ?? 0;
        var progress = total > 0 ? Math.Round((double)klaarCount / total * 100, 1) : 0;

        var soldCount = await saleableQuery.CountAsync(s => s.OwnerId != null);
        var totalRaised = await _db.Purchases.SumAsync(p => (double)p.Amount);

        var dailySales = await _db.Purchases
            .GroupBy(p => p.PurchaseDate.Date)
            .Select(g => new { Date = g.Key, Amount = g.Sum(p => (double)p.Amount), Squares = g.Sum(p => p.PurchaseSquares.Count) })
            .OrderBy(g => g.Date)
            .ToListAsync();

        const double sponsorBaseline = 2_000_000;
        var averageSpendPerBlock = soldCount > 0 ? Math.Round(totalRaised / soldCount, 2) : 0;

        var purchases = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .Include(p => p.User)
            .ToListAsync();

        var oraniaSquares = purchases.Where(p => p.User.IsOraniaResident).Sum(p => p.PurchaseSquares.Count);
        var outsiderSquares = purchases.Where(p => !p.User.IsOraniaResident).Sum(p => p.PurchaseSquares.Count);
        var bewegingSquares = purchases.Where(p => p.User.IsOraniaBewegingMember).Sum(p => p.PurchaseSquares.Count);
        var nonBewegingSquares = purchases.Where(p => !p.User.IsOraniaBewegingMember).Sum(p => p.PurchaseSquares.Count);

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

    [HttpGet("registered-no-purchase")]
    public async Task<IActionResult> GetRegisteredNoPurchase()
    {
        var usersWithPurchases = await _db.Purchases
            .Select(p => p.UserId)
            .Distinct()
            .ToListAsync();

        var adminUserIds = await _db.UserRoles
            .Where(ur => _db.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Admin"))
            .Select(ur => ur.UserId)
            .ToListAsync();

        var users = await _db.Users
            .Where(u => !usersWithPurchases.Contains(u.Id) && !adminUserIds.Contains(u.Id))
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
            return BadRequest(new { message = "Gebruiker is reeds 'n admin." });

        var result = await _userManager.AddToRoleAsync(user, "Admin");
        if (!result.Succeeded)
            return BadRequest(new { message = "Kon nie admin maak nie." });

        await _audit.LogAsync(User, "MakeAdmin", $"Promoted {dto.Email} to Admin");

        return Ok(new { message = $"{dto.Email} is nou 'n admin." });
    }

    [HttpPost("manual-purchase")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> ManualPurchase([FromForm] ManualPurchaseDto dto, IFormFile? proofOfPayment)
    {
        if (proofOfPayment != null && !FileUploadService.IsPdf(proofOfPayment))
            return BadRequest(new { message = "Bewys van betaling moet 'n geldige PDF wees." });

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

            if (squares.Any(s => s.Id < 1 || s.Id > 4200))
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
                ConfirmedAt = DateTime.UtcNow
            };

            foreach (var square in squares)
            {
                square.OwnerId = user.Id;
                purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = square.Id });
            }

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
            if (isNewUser && welcomeTempPassword != null && !string.IsNullOrWhiteSpace(user.Email))
            {
                var siteUrl = _config["App:PublicUrl"] ?? "http://localhost:4200";
                var html = EmailTemplates.ManualPurchaseWelcome(user.FirstName, user.Email, welcomeTempPassword, siteUrl);
                welcomeEmailSent = await _emailOutbox.QueueAsync(
                    user.Email,
                    "Jou Diamant Laan rekening — Diamant Laan",
                    html,
                    $"manual-purchase-welcome/{purchase.Id}");
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
            return BadRequest(new { message = "Geen beeld opgelaai nie." });

        if (!FileUploadService.IsImage(image))
            return BadRequest(new { message = "Beeld moet 'n geldige JPEG, PNG of WebP wees." });

        var squareIds = dto.SquareIds.Distinct().ToList();
        var conflictingIds = await GetConflictingSquareIdsAsync(squareIds, dto.Status);
        var replacedCount = 0;
        var skippedCount = 0;

        if (dto.ReplaceExisting)
        {
            replacedCount = await RemoveExistingImageLinksAsync(squareIds, dto.Status);
        }
        else
        {
            skippedCount = conflictingIds.Count;
            squareIds = squareIds.Except(conflictingIds).ToList();
            if (squareIds.Count == 0)
                return BadRequest(new { message = "Alle gekose blokke het reeds 'n foto vir hierdie status." });
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
            return BadRequest(new { message = "Geen beeld opgelaai nie." });

        if (!FileUploadService.IsImage(image))
            return BadRequest(new { message = "Beeld moet 'n geldige JPEG, PNG of WebP wees." });

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

        return Ok(new { id = progressImage.Id, message = "Beeld vervang." });
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

        return Ok(new { message = "Beeld verwyder." });
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
        var resend = _config.GetSection("Resend").Get<ResendSettings>() ?? new ResendSettings();
        var emailConfigured = !string.IsNullOrWhiteSpace(resend.ApiKey)
            && !string.IsNullOrWhiteSpace(resend.FromEmail);

        var pendingEmails = _db.PendingEmails.Count(e => !e.Sent);
        var pendingBlockNotifications = _db.PendingBlockNotifications.Count(p => !p.Sent);

        return Ok(new
        {
            email = new
            {
                configured = emailConfigured,
                fromEmailSet = !string.IsNullOrWhiteSpace(resend.FromEmail),
                apiKeySet = !string.IsNullOrWhiteSpace(resend.ApiKey),
                pendingOutboxCount = pendingEmails
            },
            notifications = new
            {
                pendingBlockNotificationCount = pendingBlockNotifications
            }
        });
    }
}
