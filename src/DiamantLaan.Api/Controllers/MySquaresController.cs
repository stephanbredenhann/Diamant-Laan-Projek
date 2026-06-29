using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/my-squares")]
[Authorize]
public class MySquaresController : ControllerBase
{
    private readonly AppDbContext _db;

    public MySquaresController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetMySquares()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var squares = await _db.Squares
            .Where(s => s.OwnerId == userId)
            .OrderBy(s => s.Id)
            .Select(s => new SquareDto
            {
                Id = s.Id,
                Status = s.Status,
                IsSold = true,
                ImageCount = _db.ProgressImageSquares.Count(pis => pis.SquareId == s.Id)
            })
            .ToListAsync();

        return Ok(squares);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetMySummary()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var blockCount = await _db.Squares.CountAsync(s => s.OwnerId == userId);
        var totalSpent = await _db.Purchases
            .Where(p => p.UserId == userId)
            .SumAsync(p => (double)p.Amount);

        return Ok(new { blockCount, totalSpent });
    }
}
