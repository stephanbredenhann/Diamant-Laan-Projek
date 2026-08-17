using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoadController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public RoadController(AppDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    private const int MaxSaleableId = 4000;

    public const string SquaresCacheKey = "road:squares";

    /// <summary>
    /// How long the square grid may be stale. Deliberately a short absolute expiry rather than
    /// invalidation from the nine places that mutate a square (PurchaseController, PaymentController,
    /// GuestPurchaseService, PendingReservationCleanupService, AdminController and the progress-image
    /// links): forgetting one of those would leave the map wrong forever, where this is wrong for at
    /// most a few seconds. Nothing is sold off this response. It only decides what the map draws, and
    /// PurchaseController re-reads ownership from the database before it reserves anything.
    /// </summary>
    private static readonly TimeSpan SquaresCacheTtl = TimeSpan.FromSeconds(5);

    [HttpGet("squares")]
    public async Task<IActionResult> GetSquares()
    {
        // The map, the purchase flow and the block picker all call this, and it projects ~4,500 rows
        // with a correlated count per row. Uncached that is the heaviest thing on the site by a wide
        // margin, and it is anonymous and unrate-limited.
        // ponytail: GetOrCreateAsync does not lock, so a cold cache lets a handful of concurrent
        // requests run the query together. Fine at this size; add a SemaphoreSlim around the miss if
        // the stampede ever shows up in the logs.
        var squares = await _cache.GetOrCreateAsync(SquaresCacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = SquaresCacheTtl;
            return _db.Squares
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
        });

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
