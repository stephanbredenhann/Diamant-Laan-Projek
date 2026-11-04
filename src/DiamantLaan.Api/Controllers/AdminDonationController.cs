using System.Globalization;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

/// <summary>
/// "Groot skenking": one donation large enough to cover hundreds or thousands of blocks, recorded
/// in two steps. The preview works out exactly which blocks it would get and writes nothing; the
/// commit takes those exact blocks back, checks them all again and sells them as one confirmed
/// purchase. Clicking 1 400 blocks on the map is not a workflow, which is why this is not simply
/// the telefoniese aankoop with a higher limit.
/// </summary>
[ApiController]
[Route("api/admin/donation")]
[Authorize(Roles = "Admin")]
public class AdminDonationController : ControllerBase
{
    public const decimal PricePerSquare = 500m;

    private static readonly NumberFormatInfo RandFormat = new() { NumberGroupSeparator = " ", NumberDecimalDigits = 0 };

    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly AuditLogService _audit;
    private readonly ManualSaleService _manualSales;

    public AdminDonationController(
        AppDbContext db,
        UserManager<User> userManager,
        AuditLogService audit,
        ManualSaleService manualSales)
    {
        _db = db;
        _userManager = userManager;
        _audit = audit;
        _manualSales = manualSales;
    }

    [HttpPost("preview")]
    public async Task<IActionResult> Preview([FromBody] LargeDonationPreviewDto dto)
    {
        var (count, amountError) = BlockCountFor(dto.Amount);
        if (amountError != null)
            return BadRequest(new { message = amountError });

        // An admin typing ranges is choosing those blocks on purpose, reserved or not, the same as
        // on the telefoniese aankoop. Only the automatic pick needs telling.
        var byRanges = dto.Mode == "ranges";
        var includeReserved = byRanges || dto.IncludeReserved;

        // Everything still for sale, in one query. At most 4 000 small rows, so the rest is in memory.
        var free = await _db.Squares
            .AsNoTracking()
            .Where(s => s.Id >= 1 && s.Id <= Square.MaxSaleableId && s.OwnerId == null)
            .OrderBy(s => s.Id)
            .Select(s => new { s.Id, s.IsReserved })
            .ToListAsync();
        var reservedCount = free.Count(s => s.IsReserved);
        var availableCount = includeReserved ? free.Count : free.Count - reservedCount;

        List<int> squareIds;
        if (!byRanges)
        {
            if (availableCount < count)
            {
                var hint = !includeReserved && reservedCount > 0
                    ? $" Nog {reservedCount} gereserveerde blokke kan ingesluit word."
                    : string.Empty;
                return BadRequest(new
                {
                    message = $"Daar is net {availableCount} blokke beskikbaar, maar {Rand(dto.Amount)} koop {count}.{hint}",
                    availableCount,
                    reservedCount
                });
            }

            squareIds = free
                .Where(s => includeReserved || !s.IsReserved)
                .Take(count)
                .Select(s => s.Id)
                .ToList();
        }
        else
        {
            var requested = dto.SquareIds ?? new List<int>();
            var rangeError = CheckRequestedIds(requested, count, dto.Amount);
            if (rangeError != null)
                return BadRequest(new { message = rangeError, availableCount, reservedCount });

            var freeIds = free.Select(s => s.Id).ToHashSet();
            var taken = requested.Where(id => !freeIds.Contains(id)).OrderBy(id => id).ToList();
            if (taken.Count > 0)
            {
                return BadRequest(new
                {
                    message = $"Hierdie blokke is reeds verkoop: {FormatRanges(taken)}.",
                    unavailableIds = taken,
                    availableCount,
                    reservedCount
                });
            }

            squareIds = requested.OrderBy(id => id).ToList();
        }

        bool? existingDonor = string.IsNullOrWhiteSpace(dto.Email)
            ? null
            : await _userManager.FindByEmailAsync(dto.Email.Trim()) != null;

        return Ok(new
        {
            squareIds,
            ranges = FormatRanges(squareIds),
            squareCount = squareIds.Count,
            amount = squareIds.Count * PricePerSquare,
            availableCount,
            reservedCount,
            includeReserved,
            existingDonor
        });
    }

    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Commit([FromForm] LargeDonationDto dto, IFormFile? proofOfPayment)
    {
        if (dto.IdempotencyKey is not { } key || key == Guid.Empty)
            return BadRequest(new { message = "Die versoek het geen bevestigingsleutel nie. Herlaai die bladsy en probeer weer." });

        var (count, amountError) = BlockCountFor(dto.Amount);
        if (amountError != null)
            return BadRequest(new { message = amountError });

        if (!TryParseIds(dto.SquareIds, out var squareIds))
            return BadRequest(new { message = "Ongeldige bloklys. Maak ’n nuwe voorskou." });

        var idsError = CheckRequestedIds(squareIds, count, dto.Amount);
        if (idsError != null)
            return BadRequest(new { message = idsError });

        if (proofOfPayment != null && !FileUploadService.IsPdf(proofOfPayment))
            return BadRequest(new { message = "Bewys van betaling moet ’n geldige PDF wees." });

        if (proofOfPayment != null && !ManualSaleService.AllowsProofOfPayment(dto.PaymentMethod))
            return BadRequest(new { message = ManualSaleService.ProofMethodError });

        squareIds.Sort();

        Purchase purchase;
        ManualBuyerResult buyer;
        string ranges;

        await using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            try
            {
                // Looked up inside the transaction: SQLite runs it BEGIN IMMEDIATE, so a second click
                // waits for the first one to commit and then finds its purchase here.
                var earlier = await _db.Purchases
                    .AsNoTracking()
                    .Include(p => p.PurchaseSquares)
                    .FirstOrDefaultAsync(p => p.IdempotencyKey == key);
                if (earlier != null)
                {
                    var earlierIds = earlier.PurchaseSquares.Select(ps => ps.SquareId).OrderBy(id => id).ToList();
                    if (!earlierIds.SequenceEqual(squareIds))
                        return Conflict(new { message = "Hierdie bevestiging is reeds vir ’n ander skenking gebruik. Herlaai die bladsy en begin oor." });

                    // The first request already sent the email; saying so again would be a lie.
                    return Ok(new
                    {
                        purchaseId = earlier.Id,
                        amount = earlier.Amount,
                        squareCount = earlierIds.Count,
                        ranges = FormatRanges(earlierIds),
                        userId = earlier.UserId,
                        newDonor = (bool?)null,
                        paymentStatus = earlier.PaymentStatus.ToString(),
                        hasProof = earlier.ProofOfPaymentPath != null,
                        emailQueued = false,
                        emailSent = false,
                        replayed = true
                    });
                }

                var squares = await _db.Squares
                    .Where(s => squareIds.Contains(s.Id))
                    .ToListAsync();

                if (squares.Count != squareIds.Count)
                    return BadRequest(new { message = "Sommige blokke bestaan nie." });

                var sold = squares.Where(s => s.OwnerId != null).Select(s => s.Id).OrderBy(id => id).ToList();
                if (sold.Count > 0)
                {
                    return BadRequest(new
                    {
                        message = $"Hierdie blokke is intussen verkoop: {FormatRanges(sold)}. Maak ’n nuwe voorskou.",
                        unavailableIds = sold
                    });
                }

                buyer = await _manualSales.UpsertBuyerAsync(new ManualBuyer(
                    dto.Email, dto.FirstName, dto.LastName, dto.PhoneNumber, dto.PhoneCountryCode,
                    dto.IsOraniaResident, dto.IsOraniaBewegingMember));
                if (buyer.Error != null)
                    return BadRequest(new { message = buyer.Error });
                var user = buyer.User!;

                purchase = new Purchase
                {
                    UserId = user.Id,
                    Amount = squares.Count * PricePerSquare,
                    PaymentStatus = PaymentStatus.Confirmed,
                    ConfirmedAt = DateTime.UtcNow,
                    PaymentMethod = dto.PaymentMethod,
                    IdempotencyKey = key
                };

                foreach (var square in squares)
                {
                    square.OwnerId = user.Id;
                    purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = square.Id });
                }

                // A donation this size gets one summary certificate, never 1 400 separate ones.
                ManualSaleService.ApplyCertificateNames(user, squares, dto.CertificateName, individual: false);

                _db.Purchases.Add(purchase);
                await _db.SaveChangesAsync();

                if (proofOfPayment != null)
                    await _manualSales.SaveProofAsync(purchase, proofOfPayment);

                ranges = FormatRanges(squareIds);
                await _audit.LogAsync(User, "LargeDonation",
                    $"Purchase #{purchase.Id} for {dto.Email}, {squares.Count} squares ({ranges}), {Rand(purchase.Amount)}");

                await transaction.CommitAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                return Conflict(new { message = "Sommige blokke is intussen deur iemand anders gekoop. Maak ’n nuwe voorskou." });
            }
        }

        // After the commit, like the telefoniese aankoop: the outbox retries a failed send, but an
        // email about a donation that rolled back could never be taken back.
        var donor = buyer.User!;
        var emailQueued = !string.IsNullOrWhiteSpace(donor.Email);
        var emailSent = await _manualSales.QueuePurchaseEmailAsync(donor, buyer.TempPassword, squareIds.Count, purchase.Amount);

        return Ok(new
        {
            purchaseId = purchase.Id,
            amount = purchase.Amount,
            squareCount = squareIds.Count,
            ranges,
            userId = donor.Id,
            newDonor = (bool?)buyer.IsNewUser,
            paymentStatus = purchase.PaymentStatus.ToString(),
            hasProof = purchase.ProofOfPaymentPath != null,
            emailQueued,
            emailSent,
            replayed = false
        });
    }

    /// <summary>
    /// Compacts a list of block numbers for people to read: [1, 2, 3, 7] becomes "1-3, 7". The same
    /// shape the admin types into the ranges box, so a preview can be pasted straight back.
    /// </summary>
    public static string FormatRanges(IEnumerable<int> ids)
    {
        var parts = new List<string>();
        int? start = null, end = null;
        foreach (var id in ids.Distinct().OrderBy(id => id))
        {
            if (end == id - 1)
            {
                end = id;
                continue;
            }
            if (start != null)
                parts.Add(start == end ? $"{start}" : $"{start}-{end}");
            start = end = id;
        }
        if (start != null)
            parts.Add(start == end ? $"{start}" : $"{start}-{end}");
        return string.Join(", ", parts);
    }

    /// <summary>How many blocks an amount buys, or why it cannot be a donation at all.</summary>
    private static (int Count, string? Error) BlockCountFor(decimal amount)
    {
        if (amount <= 0)
            return (0, "Die bedrag moet meer as R0 wees.");

        if (amount % PricePerSquare != 0)
            return (0, $"Die bedrag moet ’n veelvoud van {Rand(PricePerSquare)} wees.");

        var count = amount / PricePerSquare;
        if (count > Square.MaxSaleableId)
            return (0, $"’n Skenking kan hoogstens {Square.MaxSaleableId} blokke ({Rand(Square.MaxSaleableId * PricePerSquare)}) dek.");

        return ((int)count, null);
    }

    /// <summary>The checks a typed or returned list needs before the database is asked anything.</summary>
    private static string? CheckRequestedIds(List<int> ids, int count, decimal amount)
    {
        if (ids.Count == 0)
            return "Voer eers bloknommers in.";

        if (ids.Any(id => id < 1 || id > Square.MaxSaleableId))
            return $"Bloknommers moet tussen 1 en {Square.MaxSaleableId} wees.";

        if (ids.Distinct().Count() != ids.Count)
            return "Party blokke is meer as een keer gelys.";

        if (ids.Count != count)
            return $"Die reekse bevat {ids.Count} blokke, maar {Rand(amount)} koop {count}.";

        return null;
    }

    private static bool TryParseIds(string? text, out List<int> ids)
    {
        ids = new List<int>();
        if (string.IsNullOrWhiteSpace(text))
            return false;

        foreach (var part in text.Split(',', StringSplitOptions.TrimEntries))
        {
            if (!int.TryParse(part, NumberStyles.None, CultureInfo.InvariantCulture, out var id))
                return false;
            ids.Add(id);
        }
        return true;
    }

    private static string Rand(decimal amount) => "R" + amount.ToString("#,0", RandFormat);
}
