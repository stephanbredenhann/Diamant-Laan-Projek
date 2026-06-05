using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db) => _db = db;

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
            // Cannot downgrade from KlaarGeteer
            if (square.Status == SquareStatus.KlaarGeteer && dto.Status != SquareStatus.KlaarGeteer)
                return BadRequest(new { message = $"Blok #{square.Id} is reeds klaar geteer." });
            // Cannot skip statuses
            if ((int)dto.Status > (int)square.Status + 1)
                return BadRequest(new { message = $"Kan nie blok #{square.Id} van {square.Status} na {dto.Status} skuif nie." });

            square.Status = dto.Status;
        }

        await _db.SaveChangesAsync();
        return Ok(new { updated = squares.Count });
    }

    [HttpGet("purchases")]
    public async Task<IActionResult> GetPurchases()
    {
        var purchases = await _db.Purchases
            .Include(p => p.User)
            .Include(p => p.PurchaseSquares)
            .OrderByDescending(p => p.PurchaseDate)
            .Select(p => new
            {
                p.Id,
                UserName = p.User.FirstName + " " + p.User.LastName,
                UserEmail = p.User.Email,
                p.Amount,
                p.PurchaseDate,
                SquareCount = p.PurchaseSquares.Count
            })
            .ToListAsync();

        return Ok(purchases);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _db.Squares.CountAsync();
        var perStatus = await _db.Squares
            .GroupBy(s => s.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var klaarCount = perStatus.FirstOrDefault(x => x.Status == SquareStatus.KlaarGeteer)?.Count ?? 0;
        var progress = total > 0 ? Math.Round((double)klaarCount / total * 100, 1) : 0;

        var totalRaised = await _db.Purchases.SumAsync(p => p.Amount);

        return Ok(new
        {
            totalSquares = total,
            progress,
            totalRaised,
            perStatus
        });
    }
}
