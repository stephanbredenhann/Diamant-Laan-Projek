using DiamantLaan.Api.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class LanguageLinkServiceTests
{
    private static LanguageLinkService Create(string key = "a-signing-key-that-is-long-enough-for-hs256") =>
        new(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = key,
                ["App:PublicUrl"] = "https://oewerpad.orania.co.za"
            })
            .Build());

    [Fact]
    public void BuildUrl_ProducesALinkItsOwnVerifyAccepts()
    {
        var links = Create();

        var url = links.BuildUrl("user-1", "en");

        Assert.StartsWith("https://oewerpad.orania.co.za/api/profile/taal/en?u=user-1&s=", url);
        Assert.True(links.Verify("user-1", "en", url[(url.IndexOf("&s=", StringComparison.Ordinal) + 3)..]));
    }

    [Fact]
    public void Verify_RejectsAnotherAccountsSignature()
    {
        var links = Create();

        Assert.False(links.Verify("user-2", "en", links.Sign("user-1", "en")));
    }

    [Fact]
    public void Verify_RejectsTheSameSignatureRepointedAtAnotherLanguage()
    {
        var links = Create();

        Assert.False(links.Verify("user-1", "af", links.Sign("user-1", "en")));
    }

    [Fact]
    public void Verify_RejectsASignatureFromADifferentKey()
    {
        var signature = Create("some-other-signing-key-long-enough-for-hs256").Sign("user-1", "en");

        Assert.False(Create().Verify("user-1", "en", signature));
    }

    [Fact]
    public void Verify_RejectsGarbageWithoutThrowing()
    {
        var links = Create();

        Assert.False(links.Verify("user-1", "en", ""));
        Assert.False(links.Verify("user-1", "en", "not-base64-url!!"));
    }
}
