using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class EmailTemplatesBlockStatusTests
{
    private const string Site = "https://oewerpad.orania.co.za";
    private const string Switch = Site + "/api/profile/taal/en?u=abc&s=sig";

    [Theory]
    [InlineData(SquareStatus.Voorberei)]
    [InlineData(SquareStatus.BesigOmTeTeer)]
    [InlineData(SquareStatus.KlaarGeteer)]
    public void BlockStatusUpdate_IncludesProfileOptOutLink(SquareStatus status)
    {
        var mail = EmailTemplates.BlockStatusUpdate("Ann", status, [12], Site, en: false);

        Assert.NotNull(mail);
        Assert.Contains("Jy kan e-posse soos hierdie onder", mail.Value.Html);
        Assert.Contains(">My Profiel</a> afskakel.", mail.Value.Html);
        Assert.Contains($"href=\"{Site}/my-profiel\"", mail.Value.Html);
    }

    [Theory]
    [InlineData(SquareStatus.Voorberei)]
    [InlineData(SquareStatus.BesigOmTeTeer)]
    [InlineData(SquareStatus.KlaarGeteer)]
    public void BlockStatusUpdate_IsEnglishThroughout_WhenEnglishIsChosen(SquareStatus status)
    {
        var mail = EmailTemplates.BlockStatusUpdate("Ann", status, [12], Site, en: true, switchUrl: Switch);

        Assert.NotNull(mail);
        Assert.Contains("Dear Ann!", mail.Value.Html);
        Assert.Contains("You can turn off emails like this one under", mail.Value.Html);
        Assert.Contains("The Orania Beweging team", mail.Value.Html);
        // Nothing Afrikaans may survive: the greeting, the sign-off and the opt-out line are the
        // three that live in the shell rather than the body, so they are the ones that get missed.
        Assert.DoesNotContain("Beste Ann!", mail.Value.Html);
        Assert.DoesNotContain("Orania groete", mail.Value.Html);
        Assert.DoesNotContain("afskakel", mail.Value.Html);
    }

    /// <summary>
    /// The switch-to-English line is off while the client reads every email before readers can
    /// change the language on themselves. Passing the URL must not put it back.
    /// </summary>
    [Fact]
    public void BlockStatusUpdate_DoesNotOfferTheSwitchToEnglish()
    {
        const string line = "I would like to receive all further communication in English";

        var af = EmailTemplates.BlockStatusUpdate("Ann", SquareStatus.Voorberei, [12], Site, en: false, switchUrl: Switch);
        var en = EmailTemplates.BlockStatusUpdate("Ann", SquareStatus.Voorberei, [12], Site, en: true, switchUrl: Switch);

        var href = System.Net.WebUtility.HtmlEncode(Switch);
        Assert.DoesNotContain(line, af!.Value.Html);
        Assert.DoesNotContain(href, af.Value.Html);
        Assert.DoesNotContain(line, en!.Value.Html);
        Assert.DoesNotContain(href, en.Value.Html);
    }

    [Fact]
    public void BlockStatusUpdate_ReturnsNull_ForNogNieBeginNie()
    {
        Assert.Null(EmailTemplates.BlockStatusUpdate("Ann", SquareStatus.NogNieBeginNie, [12], Site, en: false));
    }
}
