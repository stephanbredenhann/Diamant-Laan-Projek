using System.Security.Cryptography;
using System.Text;

namespace DiamantLaan.Api.Services;

public class PayFastService : IPayFastService
{
    private readonly string _passphrase;

    public PayFastService(string passphrase)
    {
        _passphrase = passphrase;
    }

    public string CreateSignature(IDictionary<string, string> data)
    {
        return GenerateSignature(data, _passphrase);
    }

    public static string GenerateSignature(IDictionary<string, string> data, string passphrase)
    {
        var orderedFields = new[]
        {
            "merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
            "name_first", "name_last", "email_address", "cell_number",
            "m_payment_id", "amount", "item_name", "item_description",
            "custom_int1", "custom_int2", "custom_int3", "custom_int4", "custom_int5",
            "custom_str1", "custom_str2", "custom_str3", "custom_str4", "custom_str5",
            "email_confirmation", "confirmation_address", "payment_method",
            "subscription_type", "billing_date", "recurring_amount", "frequency", "cycles"
        };

        var sb = new StringBuilder();
        foreach (var field in orderedFields)
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
