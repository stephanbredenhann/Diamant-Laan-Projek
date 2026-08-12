using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
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
    private readonly ShareLinkService _shareLinks;

    public MySquaresController(AppDbContext db, ShareLinkService shareLinks)
    {
        _db = db;
        _shareLinks = shareLinks;
    }

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

    [HttpGet("share-link")]
    public async Task<IActionResult> GetShareLink()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var path = await _shareLinks.GetUrlForUserAsync(userId);
        if (path == null) return NotFound(new { message = "Geen openbare skakel nie." });
        return Ok(ToShareDto(path));
    }

    [HttpPost("share-link")]
    public async Task<IActionResult> CreateShareLink()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var created = await _shareLinks.CreateOrGetAsync(userId);
        if (created == null)
            return BadRequest(new { message = "Hierdie rekening is gedeaktiveer." });
        if (created.Value.Token.Length == 0)
            return BadRequest(new { message = "Jy het nog geen vierkante meter geborg nie." });
        return Ok(ToShareDto(_shareLinks.PathFor(created.Value.Token)));
    }

    [HttpDelete("share-link")]
    public async Task<IActionResult> DeleteShareLink()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        await _shareLinks.RevokeAsync(userId);
        return NoContent();
    }

    private ShareLinkDto ToShareDto(string path)
    {
        var origin = ControllerContext.HttpContext != null
            ? ShareLinkService.OriginFrom(Request, _shareLinks.PublicBaseUrl)
            : _shareLinks.PublicBaseUrl;
        return new ShareLinkDto
        {
            Path = path,
            Url = origin + path
        };
    }
}
