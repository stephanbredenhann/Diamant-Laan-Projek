using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PurchaseController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPayFastService _payFastService;

    public PurchaseController(AppDbContext db, IPayFastService payFastService)
    {
        _db = db;
        _payFastService = payFastService;
    }

    [HttpPost]
    public async Task<IActionResult> CreatePurchase([FromBody] PurchaseRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

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

            var minimumAmount = squares.Count * 500m;
            decimal amount = dto.Amount ?? minimumAmount;

            if (amount < minimumAmount)
                return BadRequest(new { message = $"Minimum bedrag is R{minimumAmount:0} (R500 per blok)." });

            var purchase = new Purchase
            {
                UserId = userId,
                Amount = amount,
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

            return Ok(new
            {
                purchaseId = purchase.Id,
                amount,
                squareCount = squares.Count,
                paymentStatus = purchase.PaymentStatus.ToString()
            });
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return Conflict(new { message = "Sommige blokke is intussen deur iemand anders gekoop. Probeer weer." });
        }
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

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var purchase = await _db.Purchases
                .Include(p => p.PurchaseSquares)
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

            if (purchase == null)
            {
                await transaction.RollbackAsync();
                return NotFound();
            }

            if (purchase.PaymentStatus != PaymentStatus.Pending)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Aankoop kan nie gekanselleer word nie." });
            }

            foreach (var ps in purchase.PurchaseSquares)
            {
                var square = await _db.Squares.FindAsync(ps.SquareId);
                if (square != null && square.OwnerId == userId)
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
