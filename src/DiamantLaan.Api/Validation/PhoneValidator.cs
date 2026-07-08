using System.Text.RegularExpressions;

namespace DiamantLaan.Api.Validation;

public static partial class PhoneValidator
{
    private const int MinInternationalLocalDigits = 4;
    private const int MaxInternationalLocalDigits = 15;
    private const int MaxE164Digits = 15;

    /// <summary>
    /// Validates a local phone number for the given international dialling code.
    /// For South Africa (+27): 9 digits without leading 0, or 10 with leading 0.
    /// For other countries: 4-15 digits after stripping non-digits (and an optional leading 0),
    /// with the total E.164 number (country code + local digits) not exceeding 15 digits.
    /// Returns E.164 combined with country code when valid.
    /// </summary>
    public static bool TryNormalize(string? localNumber, string? countryCode, out string e164, out string? error)
    {
        e164 = string.Empty;
        error = null;

        if (string.IsNullOrWhiteSpace(localNumber))
        {
            error = null;
            return true; // optional
        }

        var code = string.IsNullOrWhiteSpace(countryCode) ? "+27" : countryCode.Trim();
        if (!code.StartsWith('+'))
            code = "+" + code;

        if (!CountryCodeRegex().IsMatch(code))
        {
            error = "Ongeldige landkode.";
            return false;
        }

        var digits = DigitsOnlyRegex().Replace(localNumber, "");

        if (code == "+27")
        {
            if (digits.StartsWith('0'))
            {
                if (digits.Length != 10)
                {
                    error = "Foonnommer moet 9 syfers wees sonder 'n voorafgaande nul, of 10 syfers met een.";
                    return false;
                }
                digits = digits[1..];
            }
            else if (digits.Length != 9)
            {
                error = "Foonnommer moet 9 syfers wees sonder 'n voorafgaande nul, of 10 syfers met een.";
                return false;
            }
        }
        else
        {
            if (digits.StartsWith('0') && digits.Length > 1)
                digits = digits[1..];

            if (digits.Length < MinInternationalLocalDigits || digits.Length > MaxInternationalLocalDigits)
            {
                error = $"Foonnommer moet tussen {MinInternationalLocalDigits} en {MaxInternationalLocalDigits} syfers wees.";
                return false;
            }

            var countryDigits = DigitsOnlyRegex().Replace(code, "");
            if (countryDigits.Length + digits.Length > MaxE164Digits)
            {
                error = "Foonnommer is te lank vir hierdie landkode.";
                return false;
            }
        }

        e164 = code + digits;
        return true;
    }

    public static (string countryCode, string localNumber) SplitE164(string? e164, string defaultCountryCode = "+27")
    {
        var code = string.IsNullOrWhiteSpace(defaultCountryCode) ? "+27" : defaultCountryCode.Trim();
        if (!code.StartsWith('+'))
            code = "+" + code;

        if (string.IsNullOrWhiteSpace(e164))
            return (code, "");

        var value = e164.Trim();

        // The caller usually already knows the country code (e.g. from the stored user
        // record), so prefer splitting on that rather than guessing from the number alone.
        if (value.StartsWith(code) && value.Length > code.Length)
        {
            var local = value[code.Length..];
            return code == "+27" ? (code, "0" + local) : (code, local);
        }

        if (value.StartsWith('+'))
        {
            var match = LeadingCountryCodeRegex().Match(value);
            if (match.Success)
                return (match.Groups[1].Value, match.Groups[2].Value);
        }

        return (code, DigitsOnlyRegex().Replace(value, ""));
    }

    [GeneratedRegex(@"\D")]
    private static partial Regex DigitsOnlyRegex();

    [GeneratedRegex(@"^\+[1-9]\d{0,3}$")]
    private static partial Regex CountryCodeRegex();

    [GeneratedRegex(@"^(\+[1-9]\d{0,3})(\d+)$")]
    private static partial Regex LeadingCountryCodeRegex();
}
