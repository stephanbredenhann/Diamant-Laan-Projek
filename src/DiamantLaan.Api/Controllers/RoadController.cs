using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoadController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoadController(AppDbContext db) => _db = db;

    private const int MaxSaleableId = 4000;

    [HttpGet("squares")]
    public async Task<IActionResult> GetSquares()
    {
        var squares = await _db.Squares
            .OrderBy(s => s.Id)
            .Select(s => new SquareDto
            {
                Id = s.Id,
                Status = s.Status,
                IsSold = s.OwnerId != null,
                IsReserved = s.IsReserved,
                ImageCount = _db.ProgressImageSquares.Count(pis => pis.SquareId == s.Id)
            })
            .ToListAsync();

        return Ok(squares);
    }

    [HttpGet("pick-squares")]
    public async Task<IActionResult> PickSquares([FromQuery] int count)
    {
        const int MaxPickCount = 4000;

        if (count < 1)
            return BadRequest(new { message = "Ongeldige aantal blokke." });

        if (count > MaxPickCount)
            return BadRequest(new { message = "Maksimum 4000 blokke kan gekies word." });

        var squareIds = await _db.Squares
            .Where(s => s.OwnerId == null && !s.IsReserved && s.Id <= MaxSaleableId)
            .OrderBy(s => s.Id)
            .Take(count)
            .Select(s => s.Id)
            .ToListAsync();

        if (squareIds.Count < count)
            return BadRequest(new { message = "Nie genoeg beskikbare blokke nie." });

        return Ok(new { squareIds });
    }

    /// <summary>
    /// Public headline numbers for the home and progress pages: how much has been
    /// funded, and how much of the road actually sits in each build phase.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        // The DB seeds extra rows (up to Id 4500) as headroom beyond the current road, so every
        // headline number is scoped to the actual saleable road: 1..MaxSaleableId.
        // Admin-reserved blocks stay in these totals on purpose. They are part of the road and
        // still get tarred, they are just not on public sale.
        var total = await _db.Squares.CountAsync(s => s.Id <= MaxSaleableId);
        var klaarCount = await _db.Squares.CountAsync(s => s.Status == SquareStatus.KlaarGeteer && s.Id <= MaxSaleableId);
        var progress = total > 0 ? Math.Round((double)klaarCount / total * 100, 1) : 0;
        var totalRaised = await _db.Purchases
    .Where(p => p.PaymentStatus == PaymentStatus.Confirmed)
    .SumAsync(p => (double?)p.Amount) ?? 0;

        var fundedSquares = await _db.Squares
            .CountAsync(s => s.OwnerId != null && s.Id <= MaxSaleableId);

        var byPhase = await _db.Squares
            .Where(s => s.Id <= MaxSaleableId)
            .GroupBy(s => s.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        int phase(SquareStatus st) => byPhase.FirstOrDefault(x => x.Status == st)?.Count ?? 0;

        return Ok(new
        {
            progress,
            totalRaised,
            totalSquares = total,
            saleableSquares = total,
            fundedSquares,
            phases = new
            {
                nogNieBeginNie = phase(SquareStatus.NogNieBeginNie),
                voorberei = phase(SquareStatus.Voorberei),
                besigOmTeTeer = phase(SquareStatus.BesigOmTeTeer),
                klaarGeteer = phase(SquareStatus.KlaarGeteer)
            }
        });
    }
}
