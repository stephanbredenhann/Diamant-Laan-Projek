using DiamantLaan.Api.Validation;
using Xunit;

namespace DiamantLaan.Api.Tests.Validation;

public class EmailValidatorTests
{
    [Theory]
    [InlineData("user@example.com")]
    [InlineData("first.last@sub.example.co.za")]
    public void IsValid_AcceptsWellFormedEmails(string email)
    {
        Assert.True(EmailValidator.IsValid(email, out var error));
        Assert.Null(error);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-an-email")]
    [InlineData("missing-domain@")]
    [InlineData("@missing-local.com")]
    [InlineData("two@at@signs.com")]
    [InlineData("no-dot-in-domain@example")]
    [InlineData("has spaces@example.com")]
    public void IsValid_RejectsMalformedEmails(string? email)
    {
        Assert.False(EmailValidator.IsValid(email, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void IsValid_RejectsOverlyLongEmails()
    {
        var longLocal = new string('a', 250);
        Assert.False(EmailValidator.IsValid($"{longLocal}@example.com", out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }
}
