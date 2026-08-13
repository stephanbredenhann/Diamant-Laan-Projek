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

    /// <summary>
    /// The names printed on this account's certificates: one for the summary sheet and one per
    /// block, already resolved, so the page can render without knowing the fallback rules.
    /// </summary>
    [HttpGet("certificate-names")]
    public async Task<IActionResult> GetCertificateNames()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound();

        var squares = await _db.Squares
            .Where(s => s.OwnerId == userId)
            .OrderBy(s => s.Id)
            .Select(s => new { s.Id, s.CertificateName })
            .ToListAsync();

        var summaryName = SummaryNameOf(user);

        return Ok(new CertificateNamesDto
        {
            SameForAll = squares.All(s => s.CertificateName == null),
            SummaryName = summaryName,
            Blocks = squares
                .Select(s => new BlockCertificateNameDto { SquareId = s.Id, Name = s.CertificateName ?? summaryName })
                .ToList()
        });
    }

    [HttpPut("certificate-names")]
    public async Task<IActionResult> SaveCertificateNames([FromBody] SaveCertificateNamesDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var summaryName = dto.SummaryName.Trim();
        if (summaryName.Length < 2)
            return BadRequest(new { message = "Voer asseblief ’n naam vir die opsomming-sertifikaat in." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound();

        var squares = await _db.Squares.Where(s => s.OwnerId == userId).ToListAsync();

        if (dto.SameForAll)
        {
            // One name everywhere means no per-block names at all, rather than the same string
            // copied onto every block: change it once later and every certificate follows.
            foreach (var square in squares)
                square.CertificateName = null;
        }
        else
        {
            var byId = squares.ToDictionary(s => s.Id);
            foreach (var block in dto.Blocks)
            {
                // Silently skips blocks that are not this account's; nothing to leak either way.
                if (!byId.TryGetValue(block.SquareId, out var square))
                    continue;

                var name = block.Name.Trim();
                if (name.Length < 2)
                    return BadRequest(new { message = $"Voer asseblief ’n naam vir blok {block.SquareId} in." });

                // Matching the summary name is stored as "no override", so the block keeps
                // following the summary if that is edited afterwards.
                square.CertificateName = name == summaryName ? null : name;
            }
        }

        user.CertificateName = summaryName;
        await _db.SaveChangesAsync();

        return await GetCertificateNames();
    }

    /// <summary>The chosen certificate name, or the account name for someone who never set one.</summary>
    private static string SummaryNameOf(Models.User user)
    {
        if (!string.IsNullOrWhiteSpace(user.CertificateName))
            return user.CertificateName;

        return $"{user.FirstName} {user.LastName}".Trim();
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
