using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class EmailTemplatesBlockStatusTests
{
    private const string Site = "https://oewerpad.orania.co.za";

    [Theory]
    [InlineData(SquareStatus.Voorberei)]
    [InlineData(SquareStatus.BesigOmTeTeer)]
    [InlineData(SquareStatus.KlaarGeteer)]
    public void BlockStatusUpdate_IncludesProfileOptOutLink(SquareStatus status)
    {
        var mail = EmailTemplates.BlockStatusUpdate("Ann", status, [12], Site);

        Assert.NotNull(mail);
        Assert.Contains("Jy kan e-posse soos hierdie onder", mail.Value.Html);
        Assert.Contains(">My Profiel</a> afskakel.", mail.Value.Html);
        Assert.Contains($"href=\"{Site}/my-profiel\"", mail.Value.Html);
    }

    [Fact]
    public void BlockStatusUpdate_ReturnsNull_ForNogNieBeginNie()
    {
        Assert.Null(EmailTemplates.BlockStatusUpdate("Ann", SquareStatus.NogNieBeginNie, [12], Site));
    }
}
