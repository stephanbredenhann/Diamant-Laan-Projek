using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class RefreshTokenService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public RefreshTokenService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<RefreshToken> CreateAsync(string userId)
    {
        var token = new RefreshToken
        {
            UserId = userId,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = DateTime.UtcNow.AddDays(int.Parse(_config["Jwt:RefreshExpireDays"] ?? "7"))
        };
        _db.RefreshTokens.Add(token);
        await _db.SaveChangesAsync();
        return token;
    }

    public async Task<RefreshToken?> ValidateAsync(string token)
    {
        return await _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == token && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow);
    }

    public async Task RevokeAsync(string token)
    {
        var existing = await _db.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == token);
        if (existing != null)
        {
            existing.IsRevoked = true;
            await _db.SaveChangesAsync();
        }
    }

    public async Task RevokeAllForUserAsync(string userId)
    {
        var tokens = await _db.RefreshTokens.Where(rt => rt.UserId == userId && !rt.IsRevoked).ToListAsync();
        foreach (var t in tokens)
            t.IsRevoked = true;
        await _db.SaveChangesAsync();
    }
}

public class AuditLogService
{
    private readonly AppDbContext _db;

    public AuditLogService(AppDbContext db) => _db = db;

    public async Task LogAsync(ClaimsPrincipal admin, string action, string details)
    {
        var adminId = admin.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(adminId)) return;

        _db.AdminAuditLogs.Add(new AdminAuditLog
        {
            AdminUserId = adminId,
            Action = action,
            Details = details
        });
        await _db.SaveChangesAsync();
    }
}
