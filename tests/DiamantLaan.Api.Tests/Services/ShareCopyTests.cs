using DiamantLaan.Api.Services;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class ShareCopyTests
{
    [Fact]
    public void MeterFrase_StaysVierkanteMeter()
    {
        Assert.Equal("1 vierkante meter", ShareCopy.MeterFrase(1));
        Assert.Equal("5 vierkante meter", ShareCopy.MeterFrase(5));
    }

    [Fact]
    public void ImageSentence_UsesFirstName()
    {
        Assert.Equal("Jan het 5 vierkante meter geborg", ShareCopy.ImageSentence("Jan", 5));
    }

    [Fact]
    public void DisplayName_FallsBackWhenBlank()
    {
        Assert.Equal("Iemand", ShareCopy.DisplayName("  "));
        Assert.Equal("Iemand het 1 vierkante meter geborg", ShareCopy.ImageSentence(null, 1));
    }
}
