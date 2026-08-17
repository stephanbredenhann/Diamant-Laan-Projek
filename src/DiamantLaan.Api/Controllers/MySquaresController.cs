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
    /// How long after a purchase is confirmed its blocks may still have their certificate names
    /// changed. Once it passes the certificate is treated as issued, and only an admin can fix it.
    /// </summary>
    public static readonly TimeSpan CertificateEditWindow = TimeSpan.FromMinutes(15);

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
        var openUntil = await EditableUntilAsync(userId);
        var now = DateTime.UtcNow;
        var stillOpen = openUntil.Values.Where(until => until > now).ToList();

        return Ok(new CertificateNamesDto
        {
            SameForAll = !user.CertificateIndividual,
            SummaryName = summaryName,
            Blocks = squares
                .Select(s => new BlockCertificateNameDto
                {
                    SquareId = s.Id,
                    Name = s.CertificateName ?? summaryName,
                    CanEdit = openUntil.TryGetValue(s.Id, out var until) && until > now
                })
                .ToList(),
            CanEdit = stillOpen.Count > 0,
            EditableUntil = stillOpen.Count > 0 ? stillOpen.Max() : null
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

        var openUntil = await EditableUntilAsync(userId);
        var now = DateTime.UtcNow;
        var editable = openUntil.Where(kv => kv.Value > now).Select(kv => kv.Key).ToHashSet();

        // The window is the whole point of the feature, so it is enforced here rather than only
        // hidden in the page: a stale tab or a replayed request must not reopen a locked name.
        if (editable.Count == 0)
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Die name op jou sertifikate is nou vasgestel. Kontak ons as iets verkeerd is."
            });

        var squares = await _db.Squares.Where(s => s.OwnerId == userId).ToListAsync();

        if (dto.SameForAll)
        {
            // No per-block name at all: every sheet falls back to the summary name. Blocks whose
            // window has closed keep the name they were issued under.
            foreach (var square in squares.Where(s => editable.Contains(s.Id)))
                square.CertificateName = null;
        }
        else
        {
            var byId = squares.ToDictionary(s => s.Id);
            foreach (var block in dto.Blocks)
            {
                // Silently skips blocks that are not this account's, or whose window has closed;
                // nothing to leak either way, and the page already renders those read-only.
                if (!byId.TryGetValue(block.SquareId, out var square) || !editable.Contains(square.Id))
                    continue;

                var name = block.Name.Trim();
                if (name.Length < 2)
                    return BadRequest(new { message = $"Voer asseblief ’n naam vir blok {block.SquareId} in." });

                // Stored as typed, even when it matches the summary. Collapsing it to null used to
                // let one later edit follow through to every sheet, but with the window there is no
                // "later", and null is now what tells a block to print the summary name instead.
                square.CertificateName = name;
            }
        }

        user.CertificateName = summaryName;
        user.CertificateIndividual = !dto.SameForAll;
        await _db.SaveChangesAsync();

        return await GetCertificateNames();
    }

    /// <summary>
    /// When each of this account's blocks stops being editable: <see cref="CertificateEditWindow"/>
    /// after the purchase that bought it was confirmed. A block with no confirmed purchase behind
    /// it is absent, which reads as locked.
    /// </summary>
    private async Task<Dictionary<int, DateTime>> EditableUntilAsync(string userId)
    {
        var rows = await _db.PurchaseSquares
            .Where(ps => ps.Purchase.UserId == userId
                      && ps.Purchase.PaymentStatus == Models.Enums.PaymentStatus.Confirmed)
            .Select(ps => new { ps.SquareId, ps.Purchase.ConfirmedAt, ps.Purchase.PurchaseDate })
            .ToListAsync();

        // Grouped in memory: a block can in principle appear on more than one purchase, and the
        // most recent one is the one whose window counts.
        return rows
            .GroupBy(r => r.SquareId)
            .ToDictionary(
                g => g.Key,
                g => g.Max(r => r.ConfirmedAt ?? r.PurchaseDate) + CertificateEditWindow);
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
