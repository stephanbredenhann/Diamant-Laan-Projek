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

    [HttpGet("squares")]
    public async Task<IActionResult> GetSquares()
    {
        var squares = await _db.Squares
            .OrderBy(s => s.Id)
            .Select(s => new SquareDto { Id = s.Id, Status = s.Status, IsSold = s.OwnerId != null })
            .ToListAsync();

        return Ok(squares);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _db.Squares.CountAsync();
        var klaarCount = await _db.Squares.CountAsync(s => s.Status == SquareStatus.KlaarGeteer);
        var progress = total > 0 ? Math.Round((double)klaarCount / total * 100, 1) : 0;
        var totalRaised = await _db.Purchases.SumAsync(p => (double)p.Amount);

        return Ok(new { progress, totalRaised });
    }
}
