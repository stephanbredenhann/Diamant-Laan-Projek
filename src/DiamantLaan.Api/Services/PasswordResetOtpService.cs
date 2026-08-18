using System.Security.Cryptography;
using System.Text;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class PasswordResetOtpService
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static readonly TimeSpan Expiry = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly EmailOutboxService _emailOutbox;
    // Optional so a test can build the mailer without a signing key: without it the emails simply
    // go out without the switch-to-English footer link. Always supplied by DI in production.
    private readonly LanguageLinkService? _languageLinks;

    public PasswordResetOtpService(
        AppDbContext db,
        UserManager<User> userManager,
        EmailOutboxService emailOutbox,
        LanguageLinkService? languageLinks = null)
    {
        _db = db;
        _userManager = userManager;
        _emailOutbox = emailOutbox;
        _languageLinks = languageLinks;
    }

    public async Task RequestAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || user.IsAnonymized || string.IsNullOrWhiteSpace(user.Email))
            return;

        var otp = GenerateOtp();
        var now = DateTime.UtcNow;

        var existing = await _db.PasswordResetOtps
            .Where(o => o.UserId == user.Id && !o.Used && o.ExpiresAt > now)
            .ToListAsync(cancellationToken);
        foreach (var row in existing)
            row.Used = true;

        var record = new PasswordResetOtp
        {
            UserId = user.Id,
            CodeHash = Hash(otp),
            ExpiresAt = now.Add(Expiry),
            CreatedAt = now
        };
        _db.PasswordResetOtps.Add(record);
        await _db.SaveChangesAsync(cancellationToken);

        var en = user.Language == "en";
        var html = EmailTemplates.PasswordResetOtp(
            user.FirstName,
            otp,
            en,
            _languageLinks?.BuildUrl(user.Id, "en"));
        await _emailOutbox.QueueAsync(
            user.Email,
            EmailTemplates.SubjectPrefix + EmailTemplates.T(en, "Herstel jou wagwoord", "Reset your password"),
            html,
            cancellationToken);
    }

    public async Task<(bool Success, string? Error)> ResetAsync(string email, string otp, string newPassword, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || user.IsAnonymized)
            return (false, "Ongeldige kode of e-pos.");

        var now = DateTime.UtcNow;
        var hash = Hash(otp.Trim().ToUpperInvariant());
        var record = await _db.PasswordResetOtps
            .Where(o => o.UserId == user.Id && !o.Used && o.ExpiresAt > now)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (record == null || !CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(record.CodeHash),
                Encoding.UTF8.GetBytes(hash)))
            return (false, "Ongeldige of vervalde kode.");

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
        if (!result.Succeeded)
            return (false, result.Errors.FirstOrDefault()?.Description ?? "Kon nie wagwoord herstel nie.");

        record.Used = true;
        await _db.SaveChangesAsync(cancellationToken);
        return (true, null);
    }

    private static string GenerateOtp()
    {
        Span<char> chars = stackalloc char[6];
        for (var i = 0; i < chars.Length; i++)
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        return new string(chars);
    }

    private static string Hash(string code)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(code.Trim().ToUpperInvariant()));
        return Convert.ToHexString(bytes);
    }
}
