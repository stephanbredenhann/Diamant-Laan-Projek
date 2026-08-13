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

    public string ImageUrl(string token, int meterCount, string? origin = null) =>
        $"{PageUrl(token, origin)}/og.jpg?m={meterCount}";

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

    public async Task<PublicShare?> FindPublicAsync(string token, CancellationToken ct = default)
    {
        if (!IsToken(token)) return null;

        var row = await _db.Users.AsNoTracking()
            .Where(u => u.ShareToken == token && !u.IsAnonymized)
            .Select(u => new { u.FirstName, u.Id })
            .FirstOrDefaultAsync(ct);
        if (row == null) return null;

        var count = await _db.Squares.CountAsync(s => s.OwnerId == row.Id, ct);
        if (count <= 0) return null;

        return new PublicShare(row.FirstName, count, token);
    }

    /// <summary>
    /// What the public page needs to draw the visitor's copy of the summary certificate: the same
    /// name and blocks the owner's own sheet prints. Dated with the latest purchase, matching the
    /// summary sheet in certificate-card.component.ts.
    /// </summary>
    public async Task<PublicCertificate?> FindCertificateAsync(string token, CancellationToken ct = default)
    {
        if (!IsToken(token)) return null;

        var user = await _db.Users.AsNoTracking()
            .Where(u => u.ShareToken == token && !u.IsAnonymized)
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.CertificateName })
            .FirstOrDefaultAsync(ct);
        if (user == null) return null;

        var blocks = await _db.Squares.AsNoTracking()
            .Where(s => s.OwnerId == user.Id)
            .OrderBy(s => s.Id)
            .Select(s => s.Id)
            .ToListAsync(ct);
        if (blocks.Count == 0) return null;

        var date = await _db.Purchases.AsNoTracking()
            .Where(p => p.UserId == user.Id)
            .OrderByDescending(p => p.PurchaseDate)
            .Select(p => (DateTime?)p.PurchaseDate)
            .FirstOrDefaultAsync(ct);

        var name = string.IsNullOrWhiteSpace(user.CertificateName)
            ? $"{user.FirstName} {user.LastName}".Trim()
            : user.CertificateName!;

        return new PublicCertificate(name, ShareCopy.DisplayName(user.FirstName), blocks, date);
    }

    public static bool IsToken(string? token) =>
        token is { Length: 32 } && token.All(c => char.IsAsciiHexDigit(c));

    public readonly record struct PublicShare(string FirstName, int MeterCount, string Token);

    public record PublicCertificate(string Name, string FirstName, IReadOnlyList<int> Blocks, DateTime? PurchaseDate);
}
