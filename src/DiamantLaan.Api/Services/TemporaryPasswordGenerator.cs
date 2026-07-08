using System.Security.Cryptography;
using DiamantLaan.Api.Validation;

namespace DiamantLaan.Api.Services;

public static class TemporaryPasswordGenerator
{
    private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string Lower = "abcdefghjkmnpqrstuvwxyz";
    private const string Digits = "23456789";
    private const string Special = "!@#$%&*";

    public static string Generate()
    {
        Span<char> password = stackalloc char[8];
        password[0] = Pick(Upper);
        password[1] = Pick(Upper);
        password[2] = Pick(Lower);
        password[3] = Pick(Lower);
        password[4] = Pick(Digits);
        password[5] = Pick(Digits);
        password[6] = Pick(Special);
        password[7] = Pick(Special);
        Shuffle(password);

        var result = new string(password);
        if (!PasswordValidator.IsValid(result, out _))
            return Generate();

        return result;
    }

    private static char Pick(string alphabet)
    {
        var index = RandomNumberGenerator.GetInt32(alphabet.Length);
        return alphabet[index];
    }

    private static void Shuffle(Span<char> chars)
    {
        for (var i = chars.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }
    }
}
