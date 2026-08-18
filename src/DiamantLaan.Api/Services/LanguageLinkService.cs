using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace DiamantLaan.Api.Services;

/// <summary>
/// Signs the one-click "switch me to English" link at the foot of every Afrikaans email, so the
/// reader can change language without signing in. The signature is over the account id and the
/// target language together, which keeps ids from being guessed or enumerated and stops a valid
/// link for one language being edited into another.
///
/// Deliberately has no expiry: the link should still work in an email someone opens months later,
/// and the worst a leaked link can do is set the sender's own language.
/// </summary>
public class LanguageLinkService
{
    private readonly byte[] _key;
    private readonly string _siteUrl;

    public LanguageLinkService(IConfiguration config)
    {
        _key = Encoding.UTF8.GetBytes(config["Jwt:Key"]!);
        _siteUrl = AppPublicUrl.Resolve(config).TrimEnd('/');
    }

    /// <summary>Absolute URL that switches <paramref name="userId"/> to <paramref name="lang"/> when followed.</summary>
    public string BuildUrl(string userId, string lang) =>
        $"{_siteUrl}/api/profile/taal/{lang}?u={Uri.EscapeDataString(userId)}&s={Sign(userId, lang)}";

    public string Sign(string userId, string lang)
    {
        var mac = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes($"{userId}|{lang}"));
        return WebEncoders.Base64UrlEncode(mac);
    }

    public bool Verify(string userId, string lang, string signature)
    {
        var expected = Encoding.UTF8.GetBytes(Sign(userId, lang));
        var actual = Encoding.UTF8.GetBytes(signature ?? "");
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }
}
