using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
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

    public PurchaseController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> CreatePurchase([FromBody] PurchaseRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

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
            Amount = amount
        };

        foreach (var square in squares)
        {
            square.OwnerId = userId;
            purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = square.Id });
        }

        _db.Purchases.Add(purchase);
        await _db.SaveChangesAsync();

        return Ok(new { purchaseId = purchase.Id, amount, squareCount = squares.Count });
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
            squares = purchase.PurchaseSquares.Select(ps => ps.SquareId)
        });
    }
}
