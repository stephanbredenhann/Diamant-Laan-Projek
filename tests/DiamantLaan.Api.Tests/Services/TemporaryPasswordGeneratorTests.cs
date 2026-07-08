using DiamantLaan.Api.Services;
using DiamantLaan.Api.Validation;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class TemporaryPasswordGeneratorTests
{
    [Fact]
    public void Generate_ReturnsExactly8Characters()
    {
        var password = TemporaryPasswordGenerator.Generate();
        Assert.Equal(8, password.Length);
    }

    [Fact]
    public void Generate_PassesPasswordValidator()
    {
        for (var i = 0; i < 20; i++)
        {
            var password = TemporaryPasswordGenerator.Generate();
            Assert.True(PasswordValidator.IsValid(password, out var error), error);
        }
    }

    [Fact]
    public void Generate_ProducesDifferentValues()
    {
        var passwords = Enumerable.Range(0, 10).Select(_ => TemporaryPasswordGenerator.Generate()).ToHashSet();
        Assert.True(passwords.Count > 1);
    }
}
