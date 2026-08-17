using System.Security.Cryptography;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class ShareLinkService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public ShareLinkService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public string PublicBaseUrl => AppPublicUrl.Resolve(_config);

    public string PathFor(string token) => $"/deel/{token}";

    public string PageUrl(string token, string? origin = null) =>
        $"{(origin ?? PublicBaseUrl).TrimEnd('/')}{PathFor(token)}";

    public string ImageUrl(string token, int meterCount, string? origin = null, int? blockId = null) =>
        $"{PageUrl(token, origin)}/og.jpg?m={meterCount}" + (blockId is null ? "" : $"&blok={blockId}");

    public static string OriginFrom(HttpRequest request, string fallback)
    {
        var proto = FirstHeader(request, "X-Forwarded-Proto") ?? request.Scheme;
        var host = FirstHeader(request, "X-Forwarded-Host") ?? request.Host.Value;
        if (string.IsNullOrWhiteSpace(host)) return fallback;
        if (string.IsNullOrWhiteSpace(proto)) proto = "https";
        return $"{proto}://{host}".TrimEnd('/');
    }

    private static string? FirstHeader(HttpRequest request, string name)
    {
        var raw = request.Headers[name].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return raw.Split(',')[0].Trim();
    }

    public async Task<string?> GetUrlForUserAsync(string userId, CancellationToken ct = default)
    {
        var token = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId && !u.IsAnonymized && u.ShareToken != null)
            .Select(u => u.ShareToken)
            .FirstOrDefaultAsync(ct);
        return token is null ? null : PathFor(token);
    }

    public async Task<(string Url, string Token)?> CreateOrGetAsync(string userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || user.IsAnonymized) return null;

        var squareCount = await _db.Squares.CountAsync(s => s.OwnerId == userId, ct);
        if (squareCount <= 0) return (Url: string.Empty, Token: string.Empty);

        if (!string.IsNullOrEmpty(user.ShareToken))
            return (PageUrl(user.ShareToken), user.ShareToken);

        string token;
        do
        {
            token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        } while (await _db.Users.AnyAsync(u => u.ShareToken == token, ct));

        user.ShareToken = token;
        await _db.SaveChangesAsync(ct);
        return (PageUrl(token), token);
    }

    public async Task<bool> RevokeAsync(string userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || user.ShareToken == null) return false;
        user.ShareToken = null;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// The link preview's headline figures. With <paramref name="blockId"/> the share is one
    /// block's own certificate, so the preview names that certificate rather than the account.
    /// </summary>
    public async Task<PublicShare?> FindPublicAsync(string token, int? blockId = null, CancellationToken ct = default)
    {
        var cert = await FindCertificateAsync(token, blockId, ct);
        if (cert == null) return null;

        return new PublicShare(cert.FirstName, cert.Blocks.Count, token);
    }

    /// <summary>
    /// What the public page needs to draw the visitor's copy of the certificate: the same name and
    /// blocks the owner's own sheet prints. Without <paramref name="blockId"/> that is the summary
    /// sheet, dated with the latest purchase, matching certificate-card.component.ts. With one, it
    /// is that single block's sheet, in that block's own name.
    /// </summary>
    public async Task<PublicCertificate?> FindCertificateAsync(
        string token, int? blockId = null, CancellationToken ct = default)
    {
        if (!IsToken(token)) return null;

        var user = await _db.Users.AsNoTracking()
            .Where(u => u.ShareToken == token && !u.IsAnonymized)
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.CertificateName })
            .FirstOrDefaultAsync(ct);
        if (user == null) return null;

        var squares = await _db.Squares.AsNoTracking()
            .Where(s => s.OwnerId == user.Id)
            .OrderBy(s => s.Id)
            .Select(s => new { s.Id, s.CertificateName })
            .ToListAsync(ct);
        if (squares.Count == 0) return null;

        var summaryName = string.IsNullOrWhiteSpace(user.CertificateName)
            ? $"{user.FirstName} {user.LastName}".Trim()
            : user.CertificateName!;

        if (blockId is int id)
        {
            var block = squares.FirstOrDefault(s => s.Id == id);
            // An unknown or unowned block number in the URL falls back to the summary rather than
            // 404: the token is still a valid share, someone has just mangled the query string.
            if (block != null)
            {
                var blockName = string.IsNullOrWhiteSpace(block.CertificateName)
                    ? summaryName
                    : block.CertificateName!;
                var blockDate = await BlockDateAsync(user.Id, id, ct);
                return new PublicCertificate(blockName, FirstWord(blockName), [id], blockDate);
            }
        }

        var date = await _db.Purchases.AsNoTracking()
            .Where(p => p.UserId == user.Id)
            .OrderByDescending(p => p.PurchaseDate)
            .Select(p => (DateTime?)p.PurchaseDate)
            .FirstOrDefaultAsync(ct);

        // The summary sheet prints the account's own name and nothing else, even when the blocks
        // carry several different names: a certificate is signed artwork, not a roll of sponsors,
        // and "& 2 ander" reads as a typo on it. Someone wanting a particular person's name on the
        // sheet shares that block instead, which the picker offers.
        return new PublicCertificate(summaryName, ShareCopy.DisplayName(user.FirstName), squares.Select(s => s.Id).ToList(), date);
    }

    /// <summary>The day one block was bought, for the sheet's date row.</summary>
    private Task<DateTime?> BlockDateAsync(string userId, int squareId, CancellationToken ct) =>
        _db.PurchaseSquares.AsNoTracking()
            .Where(ps => ps.SquareId == squareId && ps.Purchase.UserId == userId)
            .OrderBy(ps => ps.Purchase.PurchaseDate)
            .Select(ps => (DateTime?)ps.Purchase.PurchaseDate)
            .FirstOrDefaultAsync(ct);

    /// <summary>The greeting on a shared block uses a first name, not the whole printed name.</summary>
    private static string FirstWord(string name) =>
        ShareCopy.DisplayName(name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault());

    public static bool IsToken(string? token) =>
        token is { Length: 32 } && token.All(c => char.IsAsciiHexDigit(c));

    public readonly record struct PublicShare(string FirstName, int MeterCount, string Token);

    public record PublicCertificate(string Name, string FirstName, IReadOnlyList<int> Blocks, DateTime? PurchaseDate);
}
