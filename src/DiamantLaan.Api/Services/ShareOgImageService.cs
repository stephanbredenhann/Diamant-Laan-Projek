using System.Reflection;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace DiamantLaan.Api.Services;

public class ShareOgImageService
{
    public const int Width = 1200;
    public const int Height = 630;

    private static readonly Lazy<byte[]> BaseJpeg = new(LoadResource("og-base.jpg"));
    private static readonly Lazy<FontFamily> FontFamily = new(LoadFont);

    public byte[] Render(string? firstName, int meterCount)
    {
        var text = ShareCopy.ImageSentence(firstName, meterCount);

        using var image = Image.Load<Rgba32>(BaseJpeg.Value);
        if (image.Width != Width || image.Height != Height)
            image.Mutate(ctx => ctx.Resize(Width, Height));

        var family = FontFamily.Value;
        const float sidePad = 56f;
        const float wrapWidth = Width - sidePad * 2;
        var font = FitFont(family, text, wrapWidth);

        var origin = new PointF(Width / 2f, Height - 92);
        var options = new RichTextOptions(font)
        {
            Origin = origin,
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center,
            WrappingLength = wrapWidth,
            LineSpacing = 1.05f
        };

        var gradient = new LinearGradientBrush(
            new PointF(0, Height - 240),
            new PointF(0, Height),
            GradientRepetitionMode.None,
            new ColorStop(0, Color.FromRgba(0, 0, 0, 0)),
            new ColorStop(1, Color.FromRgba(0, 0, 0, 200)));

        image.Mutate(ctx =>
        {
            ctx.Fill(gradient, new RectangularPolygon(0, Height - 240, Width, 240));
            var shadow = new RichTextOptions(options) { Origin = new PointF(origin.X + 2, origin.Y + 3) };
            ctx.DrawText(shadow, text, Color.FromRgba(0, 0, 0, 160));
            ctx.DrawText(options, text, Color.White);
        });

        using var output = new MemoryStream();
        image.SaveAsJpeg(output, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder { Quality = 88 });
        return output.ToArray();
    }

    private static Font FitFont(FontFamily family, string text, float wrapWidth)
    {
        float size = 72;
        Font font;
        FontRectangle bounds;
        do
        {
            font = family.CreateFont(size, FontStyle.Regular);
            bounds = TextMeasurer.MeasureAdvance(text, new TextOptions(font)
            {
                WrappingLength = wrapWidth
            });
            size -= 2;
        } while (bounds.Width > wrapWidth && size >= 28);

        return font;
    }

    private static FontFamily LoadFont()
    {
        var fonts = new FontCollection();
        using var stream = OpenResource("BarlowCondensed-Bold.ttf");
        return fonts.Add(stream);
    }

    private static byte[] LoadResource(string fileName)
    {
        using var stream = OpenResource(fileName);
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        return ms.ToArray();
    }

    private static Stream OpenResource(string fileName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var name = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith(fileName, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Embedded share asset '{fileName}' is missing.");
        return assembly.GetManifestResourceStream(name)
            ?? throw new InvalidOperationException($"Embedded share asset '{fileName}' could not be opened.");
    }
}
