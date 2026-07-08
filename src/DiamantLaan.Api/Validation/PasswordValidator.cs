using System.Text.RegularExpressions;

namespace DiamantLaan.Api.Validation;

public static partial class PasswordValidator
{
    public const int MinLength = 8;

    public static bool IsValid(string? password, out string? error)
    {
        error = null;
        if (string.IsNullOrEmpty(password) || password.Length < MinLength)
        {
            error = "Wagwoord moet minstens 8 karakters lank wees.";
            return false;
        }

        if (!password.Any(char.IsDigit))
        {
            error = "Wagwoord moet 'n nommer bevat.";
            return false;
        }

        if (!SpecialCharRegex().IsMatch(password))
        {
            error = "Wagwoord moet 'n spesiale karakter bevat.";
            return false;
        }

        if (!password.Any(char.IsUpper))
        {
            error = "Wagwoord moet 'n hoofletter bevat.";
            return false;
        }

        if (!password.Any(char.IsLower))
        {
            error = "Wagwoord moet 'n kleinletter bevat.";
            return false;
        }

        return true;
    }

    [GeneratedRegex(@"[^a-zA-Z0-9]")]
    private static partial Regex SpecialCharRegex();
}
