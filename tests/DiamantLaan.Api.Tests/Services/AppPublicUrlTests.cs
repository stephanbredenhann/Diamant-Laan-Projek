using DiamantLaan.Api.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class AppPublicUrlTests
{
    private static IConfiguration Config(string? app = null, string? azureHost = null) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:PublicUrl"] = app,
                ["WEBSITE_HOSTNAME"] = azureHost
            })
            .Build();

    /// <summary>
    /// The live site is hardcoded, so no hosting-level setting can repoint links that have already
    /// been emailed out. A non-localhost App:PublicUrl is ignored rather than obeyed.
    /// </summary>
    [Fact]
    public void Resolve_IgnoresAConfiguredPublicUrl()
    {
        Assert.Equal(
            AppPublicUrl.LiveSite,
            AppPublicUrl.Resolve(Config(app: "https://someone-elses-host.example", azureHost: "app.azurewebsites.net")));
    }

    [Fact]
    public void Resolve_IgnoresTheAzureHostname()
    {
        Assert.Equal(
            AppPublicUrl.LiveSite,
            AppPublicUrl.Resolve(Config(azureHost: "diamantlaan-sb.azurewebsites.net")));
    }

    [Fact]
    public void Resolve_IsTheLiveSiteWhenNothingIsConfigured()
    {
        Assert.Equal("https://bou.orania.co.za", AppPublicUrl.Resolve(Config()));
    }

    /// <summary>
    /// The one that matters: a customer was emailed localhost links because nothing at the hosting
    /// level set App:PublicUrl and the shipped file said localhost. The deployed default has to be
    /// the live site on its own.
    /// </summary>
    [Fact]
    public void Resolve_ShippedAppSettingsPointAtTheLiveSite()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "DiamantLaan.sln")))
            dir = dir.Parent;
        Assert.NotNull(dir);

        var shipped = new ConfigurationBuilder()
            .AddJsonFile(Path.Combine(dir!.FullName, "src", "DiamantLaan.Api", "appsettings.json"))
            .Build();

        Assert.DoesNotContain("localhost", AppPublicUrl.Resolve(shipped));
    }

    [Fact]
    public void Resolve_KeepsLocalhostForLocalDevelopment()
    {
        Assert.Equal("http://localhost:4200", AppPublicUrl.Resolve(Config(app: "http://localhost:4200")));
    }
}
