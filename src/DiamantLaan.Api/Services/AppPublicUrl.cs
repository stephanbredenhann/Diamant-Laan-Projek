namespace DiamantLaan.Api.Services;

public static class AppPublicUrl
{
    /// <summary>
    /// Resolves the public frontend base URL for email links.
    /// Prefers App:PublicUrl, then PayFast:FrontendBaseUrl, then localhost for local dev.
    /// Skips localhost values when a non-localhost candidate exists so production can
    /// fall back to PayFast:FrontendBaseUrl while appsettings still defaults App:PublicUrl to localhost.
    /// </summary>
    public static string Resolve(IConfiguration config)
    {
        var app = Normalize(config["App:PublicUrl"]);
        var payFast = Normalize(config["PayFast:FrontendBaseUrl"]);

        if (app is not null && !IsLocalhost(app))
            return app;
        if (payFast is not null && !IsLocalhost(payFast))
            return payFast;

        return app ?? payFast ?? "http://localhost:4200";
    }

    private static string? Normalize(string? url) =>
        string.IsNullOrWhiteSpace(url) ? null : url.Trim().TrimEnd('/');

    private static bool IsLocalhost(string url) =>
        url.Contains("localhost", StringComparison.OrdinalIgnoreCase)
        || url.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase);
}
