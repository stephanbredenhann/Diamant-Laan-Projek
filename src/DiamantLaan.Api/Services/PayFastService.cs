using System.Security.Cryptography;
using System.Text;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using Microsoft.Extensions.Logging;

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
    private readonly PayFastSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PayFastService>? _logger;

    /// <summary>
    /// Creates a <see cref="PayFastService"/> with only a passphrase.
    /// Suitable for signature-generation tests only.
    /// Do <b>not</b> use this constructor for <see cref="CreatePaymentRequest"/>;
    /// use the <see cref="PayFastSettings"/> + <see cref="HttpClient"/> constructor instead.
    /// </summary>
    public PayFastService(string passphrase, ILogger<PayFastService>? logger = null)
    {
        _passphrase = passphrase;
        _settings = new PayFastSettings { Passphrase = passphrase };
        _httpClient = new HttpClient();
        _logger = logger;
    }

    // DI constructor
    public PayFastService(PayFastSettings settings, HttpClient httpClient, ILogger<PayFastService>? logger = null)
    {
        _settings = settings;
        _httpClient = httpClient;
        _passphrase = settings.Passphrase;
        _logger = logger;
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
            // Append passphrase URL-encoded, matching PayFast PHP SDK behaviour (urlencode(trim($passPhrase))).
            sb.Append("&passphrase=").Append(UrlEncode(passphrase.Trim()));
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
        var bytes = Encoding.UTF8.GetBytes(value);
        var sb = new StringBuilder();
        foreach (var b in bytes)
        {
            if (b == (byte)' ')
            {
                sb.Append('+');
            }
            else if ((b >= '0' && b <= '9') || (b >= 'A' && b <= 'Z') || (b >= 'a' && b <= 'z') || b == '-' || b == '_' || b == '.')
            {
                sb.Append((char)b);
            }
            else
            {
                sb.Append('%').Append(b.ToString("X2"));
            }
        }
        return sb.ToString();
    }

    public PayFastPaymentRequestDto CreatePaymentRequest(Purchase purchase, User user, string baseUrl)
    {
        if (string.IsNullOrWhiteSpace(_settings.MerchantId) || string.IsNullOrWhiteSpace(_settings.MerchantKey))
            throw new InvalidOperationException("PayFast MerchantId and MerchantKey must be configured.");

        baseUrl = baseUrl.TrimEnd('/') + "/";
        var frontendBaseUrl = (!string.IsNullOrWhiteSpace(_settings.FrontendBaseUrl)
            ? _settings.FrontendBaseUrl.TrimEnd('/') + "/"
            : baseUrl);

        var returnUrl = $"{frontendBaseUrl}betalings/terug?purchaseId={purchase.Id}";
        var cancelUrl = $"{frontendBaseUrl}betalings/kanselleer?purchaseId={purchase.Id}";
        var notifyUrl = !string.IsNullOrWhiteSpace(_settings.NotifyUrl)
            ? _settings.NotifyUrl
            : $"{baseUrl}api/payment/itn";

        // Only include non-empty optional fields. CreateSignature skips empty values, and
        // PayFast rejects the form if unsigned empty fields (e.g. email_address=) are posted.
        var fields = new Dictionary<string, string>
        {
            ["merchant_id"] = _settings.MerchantId,
            ["merchant_key"] = _settings.MerchantKey,
            ["return_url"] = returnUrl,
            ["cancel_url"] = cancelUrl,
            ["notify_url"] = notifyUrl,
            ["m_payment_id"] = purchase.Id.ToString(),
            ["amount"] = purchase.Amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
            ["item_name"] = $"Diamant Laan - Aankoop #{purchase.Id}"
        };

        AddOptionalField(fields, "name_first", user.FirstName);
        AddOptionalField(fields, "name_last", user.LastName);
        AddOptionalField(fields, "email_address", user.Email);

        fields["signature"] = CreateSignature(fields);

        return new PayFastPaymentRequestDto
        {
            ActionUrl = _settings.ProcessUrl ?? (_settings.Sandbox
                ? "https://sandbox.payfast.co.za/eng/process"
                : "https://www.payfast.co.za/eng/process"),
            Fields = fields
        };
    }

    public async Task<ItnVerificationResult> VerifyItnAsync(string rawBody, decimal expectedAmount)
    {
        var pairs = ParseFormUrlEncoded(rawBody);

        var signaturePair = pairs.FirstOrDefault(p => p.Key.Equals("signature", StringComparison.OrdinalIgnoreCase));
        if (string.IsNullOrEmpty(signaturePair.Value))
        {
            _logger?.LogWarning("PayFast ITN missing signature");
            return new ItnVerificationResult(false, null, null, null, null, "Missing signature");
        }

        var payload = BuildSignatureString(pairs);
        var expectedSignature = CreateSignatureFromEncodedString(payload, _settings.Passphrase);

        if (!string.Equals(signaturePair.Value, expectedSignature, StringComparison.OrdinalIgnoreCase))
        {
            _logger?.LogWarning("PayFast ITN signature mismatch");
            return new ItnVerificationResult(false, null, null, null, null, "Signature mismatch");
        }

        var data = pairs.ToDictionary(p => p.Key, p => p.Value, StringComparer.OrdinalIgnoreCase);

        var paymentStatus = data.GetValueOrDefault("payment_status");
        if (paymentStatus != "COMPLETE")
        {
            _logger?.LogWarning("PayFast ITN payment not complete: {PaymentStatus}", paymentStatus);
            return new ItnVerificationResult(false, paymentStatus, null, null, null, "Payment not complete");
        }

        var amountGrossValue = data.GetValueOrDefault("amount_gross");
        if (!decimal.TryParse(amountGrossValue, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var amountGross))
        {
            _logger?.LogWarning("PayFast ITN invalid amount_gross");
            return new ItnVerificationResult(false, paymentStatus, null, null, null, "Invalid amount");
        }

        if (Math.Abs(amountGross - expectedAmount) > 0.01m)
        {
            _logger?.LogWarning("PayFast ITN amount mismatch: expected {Expected}, got {Actual}", expectedAmount, amountGross);
            return new ItnVerificationResult(false, paymentStatus, null, null, amountGross, "Amount mismatch");
        }

        var validationString = BuildSignatureString(pairs);
        var queryUrl = _settings.QueryUrl ?? (_settings.Sandbox
            ? "https://sandbox.payfast.co.za/eng/query/validate"
            : "https://www.payfast.co.za/eng/query/validate");

        var response = await _httpClient.PostAsync(queryUrl, new StringContent(validationString, Encoding.UTF8, "application/x-www-form-urlencoded"));
        var responseText = await response.Content.ReadAsStringAsync();

        if (responseText.Trim() != "VALID")
        {
            _logger?.LogWarning("PayFast ITN server confirmation failed: {ResponseText}", responseText);
            return new ItnVerificationResult(false, paymentStatus, null, null, amountGross, "Server confirmation failed");
        }

        return new ItnVerificationResult(
            true,
            paymentStatus,
            data.GetValueOrDefault("pf_payment_id"),
            data.GetValueOrDefault("m_payment_id"),
            amountGross,
            null);
    }

    private static void AddOptionalField(Dictionary<string, string> fields, string key, string? value)
    {
        if (!string.IsNullOrEmpty(value))
            fields[key] = value;
    }

    private static List<KeyValuePair<string, string>> ParseFormUrlEncoded(string rawBody)
    {
        var pairs = new List<KeyValuePair<string, string>>();
        foreach (var part in rawBody.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var idx = part.IndexOf('=');
            var key = idx >= 0 ? part[..idx] : part;
            var value = idx >= 0 ? part[(idx + 1)..] : string.Empty;
            pairs.Add(new KeyValuePair<string, string>(key, value));
        }
        return pairs;
    }

    private static string BuildSignatureString(List<KeyValuePair<string, string>> pairs)
    {
        var sb = new StringBuilder();
        foreach (var (key, value) in pairs)
        {
            if (key.Equals("signature", StringComparison.OrdinalIgnoreCase))
                continue;
            // PayFast's ITN signature includes empty fields as "key=" in the string.
            sb.Append(key).Append('=').Append(value).Append('&');
        }
        if (sb.Length > 0)
            sb.Length--;
        return sb.ToString();
    }

    private static string CreateSignatureFromEncodedString(string payload, string passphrase)
    {
        if (string.IsNullOrEmpty(passphrase))
            return MD5Hash(payload);
        return MD5Hash($"{payload}&passphrase={UrlEncode(passphrase.Trim())}");
    }

    private static string MD5Hash(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = MD5.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
