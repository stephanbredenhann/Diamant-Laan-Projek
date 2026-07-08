using DiamantLaan.Api.Validation;
using Xunit;

namespace DiamantLaan.Api.Tests.Validation;

public class PhoneValidatorTests
{
    [Theory]
    [InlineData("821234567", "+27", "+27821234567")]
    [InlineData("0821234567", "+27", "+27821234567")]
    [InlineData("82 123 4567", "+27", "+27821234567")]
    public void TryNormalize_AcceptsValidSaNumbers(string local, string code, string expected)
    {
        Assert.True(PhoneValidator.TryNormalize(local, code, out var e164, out var error));
        Assert.Null(error);
        Assert.Equal(expected, e164);
    }

    [Theory]
    [InlineData("82123456")]
    [InlineData("082123456")]
    [InlineData("08212345678")]
    [InlineData("1821234567")]
    public void TryNormalize_RejectsInvalidLengths(string local)
    {
        Assert.False(PhoneValidator.TryNormalize(local, "+27", out _, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void TryNormalize_EmptyIsOptional()
    {
        Assert.True(PhoneValidator.TryNormalize("", "+27", out var e164, out var error));
        Assert.Equal("", e164);
        Assert.Null(error);
    }

    [Fact]
    public void SplitE164_ReturnsLocalWithLeadingZeroForZa()
    {
        var (code, local) = PhoneValidator.SplitE164("+27821234567");
        Assert.Equal("+27", code);
        Assert.Equal("0821234567", local);
    }

    [Theory]
    [InlineData("2025551234", "+1", "+12025551234")]
    [InlineData("020 5551234", "+1", "+1205551234")]
    [InlineData("7911123456", "+44", "+447911123456")]
    [InlineData("491234567", "+49", "+49491234567")]
    public void TryNormalize_AcceptsValidInternationalNumbers(string local, string code, string expected)
    {
        Assert.True(PhoneValidator.TryNormalize(local, code, out var e164, out var error));
        Assert.Null(error);
        Assert.Equal(expected, e164);
    }

    [Theory]
    [InlineData("123", "+1")]
    [InlineData("12", "+44")]
    public void TryNormalize_RejectsTooShortInternationalNumbers(string local, string code)
    {
        Assert.False(PhoneValidator.TryNormalize(local, code, out _, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void TryNormalize_RejectsTooLongInternationalNumber()
    {
        Assert.False(PhoneValidator.TryNormalize("1234567890123456", "+1", out _, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void TryNormalize_RejectsNumberExceedingTotalE164Length()
    {
        // Country code "+9999" (4 digits) + 15 local digits = 19 total, over the 15 digit E.164 limit.
        Assert.False(PhoneValidator.TryNormalize("123456789012345", "+9999", out _, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void TryNormalize_RejectsInvalidCountryCode()
    {
        Assert.False(PhoneValidator.TryNormalize("821234567", "+0", out _, out var error));
        Assert.Equal("Ongeldige landkode.", error);
    }

    [Fact]
    public void SplitE164_WorksForNonSaCountryCode()
    {
        var (code, local) = PhoneValidator.SplitE164("+12025551234", "+1");
        Assert.Equal("+1", code);
        Assert.Equal("2025551234", local);
    }
}
