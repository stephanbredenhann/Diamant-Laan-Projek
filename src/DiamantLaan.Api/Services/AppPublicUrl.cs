namespace DiamantLaan.Api.Services;

public static class AppPublicUrl
{
    /// <summary>
    /// The live site, hardcoded on purpose. Every link we email out is built from this, and mail
    /// that has already left cannot be corrected, so the origin deliberately does not come from
    /// hosting configuration: an App__PublicUrl app setting or a WEBSITE_HOSTNAME on Azure could
    /// otherwise repoint every button in every inbox. There is only ever one public origin.
    /// </summary>
    public const string LiveSite = "https://bou.orania.co.za";

    /// <summary>
    /// <see cref="LiveSite"/> everywhere except local development, which keeps its own origin so a
    /// developer's links stay on their own machine instead of pointing at production.
    /// </summary>
    public static string Resolve(IConfiguration config)
    {
        var configured = Normalize(config["App:PublicUrl"]);
        return configured is not null && IsLocalhost(configured) ? configured : LiveSite;
    }

    /// <summary>
    /// Where email images are loaded from: the app that is sending the mail, not the live site.
    /// Unlike a link, an image has to exist on whichever deployment built the email, and the live
    /// domain may be serving an older build that does not have it yet. Azure sets WEBSITE_HOSTNAME
    /// to the app's own azurewebsites.net name, which serves the same wwwroot. Only images use
    /// this; every link a reader can click still goes through <see cref="Resolve"/>.
    /// </summary>
    public static string AssetHost(IConfiguration config)
    {
        var configured = Normalize(config["App:PublicUrl"]);
        if (configured is not null && IsLocalhost(configured)) return configured;

        var azureHost = config["WEBSITE_HOSTNAME"]?.Trim().TrimEnd('/');
        return string.IsNullOrEmpty(azureHost) ? LiveSite : $"https://{azureHost}";
    }

    private static string? Normalize(string? url) =>
        string.IsNullOrWhiteSpace(url) ? null : url.Trim().TrimEnd('/');

    private static bool IsLocalhost(string url) =>
        url.Contains("localhost", StringComparison.OrdinalIgnoreCase)
        || url.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase);
}
