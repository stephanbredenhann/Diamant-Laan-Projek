using System.Net;
using System.Reflection;

namespace DiamantLaan.Api.Services;

public class SharePageRenderer
{
    private static readonly Lazy<string> Template = new(LoadTemplate);

    public string Render(string firstName, int meterCount, string pageUrl, string imageUrl, string homeUrl, string bouUrl)
    {
        var heading = ShareCopy.PageTitle(firstName, meterCount);
        var encodedHeading = WebUtility.HtmlEncode(heading);
        return Template.Value
            .Replace("{{TITLE}}", encodedHeading, StringComparison.Ordinal)
            .Replace("{{DESCRIPTION}}", WebUtility.HtmlEncode(ShareCopy.Description), StringComparison.Ordinal)
            .Replace("{{IMAGE_URL}}", WebUtility.HtmlEncode(imageUrl), StringComparison.Ordinal)
            .Replace("{{PAGE_URL}}", WebUtility.HtmlEncode(pageUrl), StringComparison.Ordinal)
            .Replace("{{HEADING}}", encodedHeading, StringComparison.Ordinal)
            .Replace("{{BOU_URL}}", WebUtility.HtmlEncode(bouUrl), StringComparison.Ordinal)
            .Replace("{{HOME_URL}}", WebUtility.HtmlEncode(homeUrl), StringComparison.Ordinal);
    }

    public static string NotFoundHtml(string homeUrl)
    {
        var safeHome = WebUtility.HtmlEncode(homeUrl);
        return
            "<!doctype html><html lang=\"af\"><head><meta charset=\"utf-8\">" +
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
            "<title>Skakel nie gevind nie</title></head><body style=\"font-family:sans-serif;padding:2rem;background:#FDF8F0;color:#1A1A1A\">" +
            "<h1>Hierdie skakel is nie meer geldig nie</h1>" +
            "<p>Die openbare bydrae-skakel bestaan nie, of is verwyder.</p>" +
            $"<p><a href=\"{safeHome}\">Terug na Diamant Laan</a></p>" +
            "</body></html>";
    }

    private static string LoadTemplate()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var name = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("page.html", StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Embedded share page template is missing.");
        using var stream = assembly.GetManifestResourceStream(name)
            ?? throw new InvalidOperationException("Embedded share page template could not be opened.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
