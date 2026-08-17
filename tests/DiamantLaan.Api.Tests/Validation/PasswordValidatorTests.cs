using DiamantLaan.Api.Validation;
using Xunit;

namespace DiamantLaan.Api.Tests.Validation;

public class PasswordValidatorTests
{
    [Theory]
    [InlineData("Short1!")]
    [InlineData("nouppercase1!")]
    [InlineData("NOLOWERCASE1!")]
    [InlineData("NoNumber!!")]
    public void IsValid_RejectsWeakPasswords(string password)
    {
        Assert.False(PasswordValidator.IsValid(password, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    /// <summary>
    /// Identity's RequireNonAlphanumeric is off, so this validator must not reject an
    /// otherwise-valid password for lacking one. When the two disagree, a registration is
    /// rejected here that Identity would have accepted (or vice versa).
    /// </summary>
    [Fact]
    public void IsValid_AllowsPasswordWithoutSpecialCharacter()
    {
        Assert.True(PasswordValidator.IsValid("NoSpecial1A", out var error));
        Assert.Null(error);
    }

    [Fact]
    public void IsValid_AcceptsStrongPassword()
    {
        Assert.True(PasswordValidator.IsValid("Str0ng!Pass", out var error));
        Assert.Null(error);
    }

    [Fact]
    public void IsValid_RequiresMinLength8()
    {
        Assert.False(PasswordValidator.IsValid("Ab1!xyz", out var error));
        Assert.Contains("8", error);
    }
}
