namespace DiamantLaan.Api.Services;

public static class AppPublicUrl
{
    
    public static string Resolve(IConfiguration config)
    {
        var app = Normalize(config["App:PublicUrl"]);
        var payFast = Normalize(config["PayFast:FrontendBaseUrl"]);

        if (app is not null && !IsLocalhost(app))
            return app;
        if (payFast is not null && !IsLocalhost(payFast))
            return payFast;

        // Nothing usable was configured. On App Service the platform tells us our own hostname,
        // and the API serves the Angular app off that same origin, so it is the site URL. Taken
        // from the environment rather than Request.Host, which a caller can forge into a link we
        // then email out with a claim token attached.
        var azureHost = Normalize(config["WEBSITE_HOSTNAME"]);
        if (azureHost is not null && !IsLocalhost(azureHost))
            return azureHost.Contains("://") ? azureHost : $"https://{azureHost}";

        return app ?? payFast ?? "http://localhost:4200";
    }

    private static string? Normalize(string? url) =>
        string.IsNullOrWhiteSpace(url) ? null : url.Trim().TrimEnd('/');

    private static bool IsLocalhost(string url) =>
        url.Contains("localhost", StringComparison.OrdinalIgnoreCase)
        || url.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase);
}
