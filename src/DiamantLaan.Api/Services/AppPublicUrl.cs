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

        return app ?? payFast ?? "http://localhost:4200";
    }

    private static string? Normalize(string? url) =>
        string.IsNullOrWhiteSpace(url) ? null : url.Trim().TrimEnd('/');

    private static bool IsLocalhost(string url) =>
        url.Contains("localhost", StringComparison.OrdinalIgnoreCase)
        || url.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase);
}
