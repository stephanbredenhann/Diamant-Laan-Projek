using DiamantLaan.Api.Services;
using SixLabors.ImageSharp;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class ShareOgImageServiceTests
{
    [Fact]
    public void Render_ReturnsJpegOfExpectedSize()
    {
        var jpeg = new ShareOgImageService().Render("Jan", 5);
        using var image = Image.Load(jpeg);
        Assert.Equal(1200, image.Width);
        Assert.Equal(630, image.Height);
        Assert.True(jpeg[0] == 0xFF && jpeg[1] == 0xD8);
    }

    [Fact]
    public void Render_ShrinksLongNamesWithoutThrowing()
    {
        var jpeg = new ShareOgImageService().Render("Johannes-Petrus-Wilhelmus", 12);
        using var image = Image.Load(jpeg);
        Assert.Equal(1200, image.Width);
        Assert.Equal(630, image.Height);
    }
}
