using DiamantLaan.Api.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class StadsbouerPhotoShrinkTests
{
    [Fact]
    public async Task LargePhotoIsDownscaledAndSmallOneLeftAlone()
    {
        var big = Path.Combine(Path.GetTempPath(), $"sb-big-{Guid.NewGuid():N}.jpg");
        var small = Path.Combine(Path.GetTempPath(), $"sb-small-{Guid.NewGuid():N}.png");
        try
        {
            using (var image = new Image<Rgb24>(3000, 1500)) await image.SaveAsync(big);
            using (var image = new Image<Rgb24>(200, 100)) await image.SaveAsync(small);
            var smallBytes = await File.ReadAllBytesAsync(small);

            await FileUploadService.ShrinkStadsbouerPhotoAsync(big);
            await FileUploadService.ShrinkStadsbouerPhotoAsync(small);

            var info = await Image.IdentifyAsync(big);
            Assert.Equal((600, 300), (info.Width, info.Height));
            Assert.Equal(smallBytes, await File.ReadAllBytesAsync(small));
        }
        finally
        {
            File.Delete(big);
            File.Delete(small);
        }
    }

    [Fact]
    public async Task UndecodableFileIsLeftAsIs()
    {
        var path = Path.Combine(Path.GetTempPath(), $"sb-junk-{Guid.NewGuid():N}.jpg");
        try
        {
            await File.WriteAllBytesAsync(path, [0xFF, 0xD8, 0xFF, 0x00, 0x01]);
            await FileUploadService.ShrinkStadsbouerPhotoAsync(path);
            Assert.Equal(5, new FileInfo(path).Length);
        }
        finally
        {
            File.Delete(path);
        }
    }
}
