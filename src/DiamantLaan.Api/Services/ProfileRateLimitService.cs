using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class ProfileRateLimitService
{
    public const int MaxChanges = 3;
    public static readonly TimeSpan Window = TimeSpan.FromHours(12);

    private readonly AppDbContext _db;

    public ProfileRateLimitService(AppDbContext db) => _db = db;

    public async Task<(bool Allowed, int Remaining, DateTime? WindowResetsAt)> CheckAsync(string userId)
    {
        var since = DateTime.UtcNow - Window;
        var recent = await _db.ProfileChangeLogs
            .Where(l => l.UserId == userId && l.CreatedAt >= since)
            .OrderBy(l => l.CreatedAt)
            .ToListAsync();

        var count = recent.Count;
        var remaining = Math.Max(0, MaxChanges - count);
        DateTime? resetsAt = recent.Count > 0 ? recent[0].CreatedAt.Add(Window) : null;
        return (count < MaxChanges, remaining, resetsAt);
    }

    public async Task LogAsync(string userId, string changeType)
    {
        _db.ProfileChangeLogs.Add(new ProfileChangeLog
        {
            UserId = userId,
            ChangeType = changeType,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }
}
