using System.Security.Cryptography;
using System.Text;

namespace DiamantLaan.Api.Services;

public class PayFastService : IPayFastService
{
    /// <summary>
    /// Canonical order of PayFast form fields as defined by the PayFast API documentation.
    /// Fields not in this list are ignored when building the signature query string.
    /// </summary>
    private static readonly string[] OrderedSignatureFields =
    [
        "merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
        "name_first", "name_last", "email_address", "cell_number",
        "m_payment_id", "amount", "item_name", "item_description",
        "custom_int1", "custom_int2", "custom_int3", "custom_int4", "custom_int5",
        "custom_str1", "custom_str2", "custom_str3", "custom_str4", "custom_str5",
        "email_confirmation", "confirmation_address", "payment_method",
        "subscription_type", "billing_date", "recurring_amount", "frequency", "cycles"
    ];

    private readonly string _passphrase;

    public PayFastService(string passphrase)
    {
        _passphrase = passphrase;
    }

    /// <inheritdoc cref="IPayFastService.CreateSignature"/>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="data"/> is null.</exception>
    public string CreateSignature(IReadOnlyDictionary<string, string> data)
    {
        return CreateSignature(data, _passphrase);
    }

    /// <summary>
    /// Computes the MD5-based PayFast signature for the given form data and passphrase.
    /// </summary>
    /// <param name="data">
    /// The key-value pairs representing the PayFast form fields.
    /// Only fields in <see cref="OrderedSignatureFields"/> are included; all others are ignored.
    /// </param>
    /// <param name="passphrase">
    /// The merchant passphrase (salt). If null or empty, no passphrase is appended
    /// to the parameter string before hashing.
    /// </param>
    /// <returns>The lowercase hex-encoded MD5 hash of the parameter string.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="data"/> is null.</exception>
    /// <remarks>
    /// <para>
    /// PayFast signatures are built by concatenating form fields (in a specific order)
    /// with their URL-encoded values using the PHP <c>urlencode</c> convention.
    /// </para>
    /// <para>
    /// The <see cref="UrlEncode"/> implementation follows the PHP <c>urlencode</c>
    /// specification, which differs from RFC 3986 / <see cref="Uri.EscapeDataString"/>:
    /// </para>
    /// <list type="bullet">
    ///   <item>Spaces are encoded as <c>+</c> (not <c>%20</c>).</item>
    ///   <item>Only alphanumerics (<c>A-Z</c>, <c>a-z</c>, <c>0-9</c>), hyphens (<c>-</c>),
    ///       underscores (<c>_</c>), and periods (<c>.</c>) are left unencoded.</item>
    ///   <item>All other characters — including <c>~</c>, <c>*</c>, <c>#</c>, <c>@</c>,
    ///       and <c>+</c> — are percent-encoded (<c>%XX</c>).</item>
    /// </list>
    /// <para>
    /// This behavior is intentional and required for correct PayFast signature verification.
    /// </para>
    /// </remarks>
    public static string CreateSignature(IReadOnlyDictionary<string, string> data, string passphrase)
    {
        ArgumentNullException.ThrowIfNull(data);

        var sb = new StringBuilder();
        foreach (var field in OrderedSignatureFields)
        {
            if (!data.TryGetValue(field, out var value) || string.IsNullOrEmpty(value))
                continue;

            sb.Append(field).Append('=').Append(UrlEncode(value)).Append('&');
        }

        if (sb.Length > 0)
            sb.Length--;

        if (!string.IsNullOrEmpty(passphrase))
        {
            sb.Append("&passphrase=").Append(UrlEncode(passphrase));
        }

        return MD5Hash(sb.ToString());
    }

    /// <summary>
    /// Encodes a string using the PHP <c>urlencode</c> convention.
    /// </summary>
    /// <param name="value">The string to encode.</param>
    /// <returns>
    /// A URL-encoded string where spaces become <c>+</c> and all characters
    /// except <c>A-Z a-z 0-9 - _ .</c> are percent-encoded.
    /// </returns>
    /// <remarks>
    /// This intentionally produces output compatible with PHP's <c>urlencode</c>
    /// rather than RFC 3986. PayFast expects this exact encoding when verifying signatures.
    /// Notable differences from <see cref="Uri.EscapeDataString"/>:
    /// <list type="bullet">
    ///   <item>Space → <c>+</c> (not <c>%20</c>).</item>
    ///   <item><c>~</c> → <c>%7E</c> (Uri.EscapeDataString leaves it unencoded).</item>
    ///   <item><c>*</c> → <c>%2A</c> (Uri.EscapeDataString leaves it unencoded).</item>
    /// </list>
    /// </remarks>
    public static string UrlEncode(string value)
    {
        var sb = new StringBuilder();
        foreach (var ch in value)
        {
            if (ch == ' ')
            {
                sb.Append('+');
            }
            else if ((ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch == '-' || ch == '_' || ch == '.')
            {
                sb.Append(ch);
            }
            else
            {
                sb.Append('%').Append(((int)ch).ToString("X2"));
            }
        }
        return sb.ToString();
    }

    private static string MD5Hash(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = MD5.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
