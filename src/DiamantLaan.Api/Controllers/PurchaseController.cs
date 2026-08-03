using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using DiamantLaan.Api.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PurchaseController : ControllerBase
{
    private const int MaxConcurrentPendingPurchases = 3;
    private const int MaxSaleableSquareId = 4200;
    private const decimal PricePerSquare = 500m;

    private readonly AppDbContext _db;
    private readonly IPayFastService _payFastService;
    private readonly GuestPurchaseService _guests;

    public PurchaseController(AppDbContext db, IPayFastService payFastService, GuestPurchaseService guests)
    {
        _db = db;
        _payFastService = payFastService;
        _guests = guests;
    }

    [HttpPost]
    [EnableRateLimiting("purchase")]
    public async Task<IActionResult> CreatePurchase([FromBody] PurchaseRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var pendingCount = await _db.Purchases
            .CountAsync(p => p.UserId == userId && p.PaymentStatus == PaymentStatus.Pending);
        if (pendingCount >= MaxConcurrentPendingPurchases)
        {
            return BadRequest(new
            {
                message = $"Jy het reeds {MaxConcurrentPendingPurchases} hangende aankope. Voltooi of kanselleer hulle eers."
            });
        }

        var (purchase, error) = await ReserveSquaresAsync(userId, dto.SquareIds);
        if (error != null)
            return error;

        return Ok(new
        {
            purchaseId = purchase!.Id,
            amount = purchase.Amount,
            squareCount = purchase.PurchaseSquares.Count,
            paymentStatus = purchase.PaymentStatus.ToString()
        });
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMyTransactions()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var purchases = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .Where(p => p.UserId == userId && p.PaymentStatus == PaymentStatus.Confirmed)
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync();

        return Ok(purchases.Select(p => PurchaseTransactionMapper.ToDto(p)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPurchase(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (purchase == null)
            return NotFound();

        return Ok(new
        {
            purchase.Id,
            purchase.Amount,
            purchase.PurchaseDate,
            paymentStatus = purchase.PaymentStatus.ToString(),
            squares = purchase.PurchaseSquares.Select(ps => ps.SquareId)
        });
    }

    [HttpPost("{id}/pay")]
    public async Task<IActionResult> Pay(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (purchase == null)
            return NotFound();

        if (purchase.PaymentStatus != PaymentStatus.Pending)
            return BadRequest(new { message = "Aankoop is nie in 'n hangende status nie." });

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return Unauthorized();

        var baseUrl = $"{Request.Scheme}://{Request.Host}/";
        var request = _payFastService.CreatePaymentRequest(purchase, user, baseUrl);

        return Ok(request);
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (purchase == null)
            return NotFound();

        return await ReleaseReservationAsync(purchase);
    }

    // ------------------------------------------------------------------
    // Guest checkout, no account required. Every guest endpoint is
    // authorised by a bearer token handed out once, at purchase creation.
    // ------------------------------------------------------------------

    [AllowAnonymous]
    [HttpPost("guest")]
    [EnableRateLimiting("guest-purchase")]
    public async Task<IActionResult> CreateGuestPurchase([FromBody] GuestPurchaseRequestDto dto)
    {
        // A signed-in buyer must use the normal flow so the blocks land on their own account.
        if (User.Identity?.IsAuthenticated == true)
            return BadRequest(new { message = "Jy is reeds aangemeld. Gebruik die gewone aankoopvloei." });

        var email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
        if (email != null && !EmailValidator.IsValid(email, out var emailError))
            return BadRequest(new { message = emailError });

        var ipHash = GuestPurchaseService.Hash(HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        var pending = await _guests.CountPendingForIpAsync(ipHash);
        if (pending >= GuestPurchaseService.MaxPendingPerIp)
        {
            return BadRequest(new
            {
                message = "Daar is reeds te veel onvoltooide aankope vanaf hierdie toestel. Voltooi hulle eers, of probeer oor 15 minute weer."
            });
        }

        var shadowUser = await _guests.CreateShadowUserAsync();

        var (purchase, error) = await ReserveSquaresAsync(shadowUser.Id, dto.SquareIds);
        if (error != null)
        {
            _db.Users.Remove(shadowUser);
            await _db.SaveChangesAsync();
            return error;
        }

        var token = GuestPurchaseService.GenerateToken();
        purchase!.GuestTokenHash = GuestPurchaseService.Hash(token);
        purchase.GuestEmail = email;
        purchase.GuestIpHash = ipHash;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            purchaseId = purchase.Id,
            token,
            amount = purchase.Amount,
            squareCount = purchase.PurchaseSquares.Count,
            paymentStatus = purchase.PaymentStatus.ToString()
        });
    }

    [AllowAnonymous]
    [HttpGet("guest/{id}")]
    public async Task<IActionResult> GetGuestPurchase(int id, [FromQuery] string? token)
    {
        var purchase = await _guests.FindByTokenAsync(id, token);
        if (purchase == null)
            return NotFound();

        return Ok(new
        {
            purchase.Id,
            purchase.Amount,
            purchase.PurchaseDate,
            paymentStatus = purchase.PaymentStatus.ToString(),
            squares = purchase.PurchaseSquares.Select(ps => ps.SquareId).OrderBy(squareId => squareId),
            certificateName = BuildCertificateName(purchase.User),
            email = purchase.GuestEmail
        });
    }

    [AllowAnonymous]
    [HttpPost("guest/{id}/pay")]
    [EnableRateLimiting("guest-purchase")]
    public async Task<IActionResult> PayGuestPurchase(int id, [FromBody] GuestTokenDto dto)
    {
        var purchase = await _guests.FindByTokenAsync(id, dto.Token);
        if (purchase == null)
            return NotFound();

        if (purchase.PaymentStatus != PaymentStatus.Pending)
            return BadRequest(new { message = "Aankoop is nie in 'n hangende status nie." });

        // PayFast only reads the display fields. The shadow user has no email of its own,
        // so hand it whatever the guest volunteered at checkout.
        var payFastUser = new User
        {
            FirstName = purchase.User?.FirstName ?? string.Empty,
            LastName = purchase.User?.LastName ?? string.Empty,
            Email = purchase.GuestEmail
        };

        var baseUrl = $"{Request.Scheme}://{Request.Host}/";
        return Ok(_payFastService.CreatePaymentRequest(purchase, payFastUser, baseUrl));
    }

    [AllowAnonymous]
    [HttpPost("guest/{id}/cancel")]
    [EnableRateLimiting("guest-purchase")]
    public async Task<IActionResult> CancelGuestPurchase(int id, [FromBody] GuestTokenDto dto)
    {
        var purchase = await _guests.FindByTokenAsync(id, dto.Token);
        if (purchase == null)
            return NotFound();

        return await ReleaseReservationAsync(purchase);
    }

    [AllowAnonymous]
    [HttpPost("guest/{id}/certificate-name")]
    [EnableRateLimiting("guest-purchase")]
    public async Task<IActionResult> SetGuestCertificateName(int id, [FromBody] GuestCertificateNameDto dto)
    {
        var purchase = await _guests.FindByTokenAsync(id, dto.Token);
        if (purchase == null)
            return NotFound();

        if (purchase.PaymentStatus != PaymentStatus.Confirmed)
            return BadRequest(new { message = "Die betaling is nog nie bevestig nie." });

        var name = dto.Name.Trim();
        if (name.Length < 2)
            return BadRequest(new { message = "Voer asseblief 'n naam in." });

        await _guests.SetCertificateNameAsync(purchase, name);

        return Ok(new { certificateName = name });
    }

    /// <summary>
    /// Attaches a guest purchase to the signed-in account. Used when someone checked out as a
    /// guest but already had an account, so registering afresh is not an option.
    /// </summary>
    [HttpPost("guest/{id}/claim")]
    public async Task<IActionResult> ClaimGuestPurchase(int id, [FromBody] GuestTokenDto dto)
    {
        var purchase = await _guests.FindByTokenAsync(id, dto.Token);
        if (purchase == null)
            return NotFound();

        if (purchase.PaymentStatus != PaymentStatus.Confirmed)
            return BadRequest(new { message = "Die betaling is nog nie bevestig nie." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var merged = await _guests.MergeIntoUserAsync(purchase, userId);
        if (!merged)
            return BadRequest(new { message = "Hierdie aankoop is reeds aan 'n rekening gekoppel." });

        return Ok(new { purchaseId = purchase.Id });
    }

    private static string? BuildCertificateName(User? user)
    {
        if (user == null)
            return null;

        var name = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrEmpty(name) ? null : name;
    }

    /// <summary>
    /// Reserves squares for a user and opens a pending purchase. Shared by the signed-in and
    /// guest flows so the two cannot drift apart.
    /// </summary>
    private async Task<(Purchase? purchase, IActionResult? error)> ReserveSquaresAsync(string userId, List<int> squareIds)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var squares = await _db.Squares
                .Where(s => squareIds.Contains(s.Id))
                .ToListAsync();

            if (squares.Count != squareIds.Count)
                return (null, BadRequest(new { message = "Sommige blokke bestaan nie." }));

            if (squares.Any(s => s.OwnerId != null))
                return (null, BadRequest(new { message = "Sommige blokke is reeds verkoop." }));

            if (squares.Any(s => s.Id < 1 || s.Id > MaxSaleableSquareId))
                return (null, BadRequest(new { message = "Ongeldige blokke gekies." }));

            var purchase = new Purchase
            {
                UserId = userId,
                Amount = squares.Count * PricePerSquare,
                PaymentStatus = PaymentStatus.Pending
            };

            foreach (var square in squares)
            {
                square.OwnerId = userId;
                purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = square.Id });
            }

            _db.Purchases.Add(purchase);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return (purchase, null);
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return (null, Conflict(new { message = "Sommige blokke is intussen deur iemand anders gekoop. Probeer weer." }));
        }
    }

    private async Task<IActionResult> ReleaseReservationAsync(Purchase purchase)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            if (purchase.PaymentStatus != PaymentStatus.Pending)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Aankoop kan nie gekanselleer word nie." });
            }

            foreach (var ps in purchase.PurchaseSquares)
            {
                var square = await _db.Squares.FindAsync(ps.SquareId);
                if (square != null && square.OwnerId == purchase.UserId)
                    square.OwnerId = null;
            }

            purchase.PaymentStatus = PaymentStatus.Cancelled;
            purchase.CancelledAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { purchaseId = purchase.Id, paymentStatus = purchase.PaymentStatus.ToString() });
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return Conflict(new { message = "Aankoopstatus het intussen verander. Probeer weer." });
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Kon nie aankoop kanselleer nie." });
        }
    }
}
