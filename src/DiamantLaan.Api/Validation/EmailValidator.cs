using System.Text.RegularExpressions;

namespace DiamantLaan.Api.Validation;

/// <summary>
/// Practical email format check. [EmailAddress] model validation already runs via
/// [ApiController], but it returns generic English ModelState errors, so this gives
/// controllers a way to surface a consistent Afrikaans message instead.
/// </summary>
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
