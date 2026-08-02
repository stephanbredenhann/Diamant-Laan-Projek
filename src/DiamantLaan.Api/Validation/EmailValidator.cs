using System.Text.RegularExpressions;

namespace DiamantLaan.Api.Validation;


public static partial class EmailValidator
{
    private const int MaxLength = 254;

    public static bool IsValid(string? email, out string? error)
    {
        error = null;

        if (string.IsNullOrWhiteSpace(email))
        {
            error = "Voer 'n geldige e-posadres in.";
            return false;
        }

        var trimmed = email.Trim();
        if (trimmed.Length > MaxLength || !EmailRegex().IsMatch(trimmed))
        {
            error = "Voer 'n geldige e-posadres in.";
            return false;
        }

        return true;
    }

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex EmailRegex();
}
