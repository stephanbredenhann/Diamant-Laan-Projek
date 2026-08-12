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

    /// <summary>Squares outside this range are road shoulders and are never sold.</summary>
    private const int MinPickId = 200;
    private const int MaxSaleableId = 4200;

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
            .Where(s => s.OwnerId == null && s.Id >= MinPickId && s.Id <= MaxSaleableId)
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
        var total = await _db.Squares.CountAsync();
        var klaarCount = await _db.Squares.CountAsync(s => s.Status == SquareStatus.KlaarGeteer);
        var progress = total > 0 ? Math.Round((double)klaarCount / total * 100, 1) : 0;
        var totalRaised = await _db.Purchases
    .Where(p => p.PaymentStatus == PaymentStatus.Confirmed)
    .SumAsync(p => (double?)p.Amount) ?? 0;

        // Every square may be sold — the MinPickId floor only limits which ones we
        // hand out automatically — so the funded count spans the whole road.
        var saleableTotal = await _db.Squares
            .CountAsync(s => s.Id >= MinPickId && s.Id <= MaxSaleableId);
        var fundedSquares = await _db.Squares.CountAsync(s => s.OwnerId != null);

        var byPhase = await _db.Squares
            .GroupBy(s => s.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        int phase(SquareStatus st) => byPhase.FirstOrDefault(x => x.Status == st)?.Count ?? 0;

        return Ok(new
        {
            progress,
            totalRaised,
            totalSquares = total,
            saleableSquares = saleableTotal,
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
