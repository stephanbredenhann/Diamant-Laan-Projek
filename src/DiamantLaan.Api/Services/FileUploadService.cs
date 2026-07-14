namespace DiamantLaan.Api.Services;

public static class FileUploadService
{
    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    public static bool IsPdf(IFormFile file)
    {
        if (!file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
            return false;

        Span<byte> header = stackalloc byte[5];
        using var stream = file.OpenReadStream();
        var read = stream.Read(header);
        return read >= 5 && header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46 && header[4] == 0x2D;
    }

    public static bool IsImage(IFormFile file)
    {
        if (!AllowedImageContentTypes.Contains(file.ContentType))
            return false;

        Span<byte> header = stackalloc byte[12];
        using var stream = file.OpenReadStream();
        var read = stream.Read(header);
        if (read < 3) return false;

        // JPEG: FF D8 FF
        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return true;

        // PNG: 89 50 4E 47
        if (read >= 4 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47)
            return true;

        // WebP: RIFF....WEBP
        if (read >= 12
            && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
            && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
            return true;

        return false;
    }

    public static string GetImageExtension(string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => ".bin"
    };

    public static string GetContentTypeFromExtension(string extension) => extension.ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        _ => "application/octet-stream"
    };

    private static bool IsRunningOnAzure =>
        !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME"));

    /// <summary>
    /// On Azure, store uploads under /home/site/uploads so they survive zip deploys of wwwroot.
    /// Locally, use App_Data/uploads under the content root.
    /// </summary>
    private static string GetUploadsRoot(IWebHostEnvironment env) =>
        IsRunningOnAzure
            ? "/home/site/uploads"
            : Path.Combine(env.ContentRootPath, "App_Data", "uploads");

    public static string GetPrivateUploadsPath(IWebHostEnvironment env)
    {
        var path = Path.Combine(GetUploadsRoot(env), "proofs");
        Directory.CreateDirectory(path);
        return path;
    }

    public static string GetProgressUploadsPath(IWebHostEnvironment env)
    {
        var path = Path.Combine(GetUploadsRoot(env), "progress");
        Directory.CreateDirectory(path);
        return path;
    }

    public static string? ResolveProofFilePath(IWebHostEnvironment env, string? storedPath)
    {
        if (string.IsNullOrWhiteSpace(storedPath))
            return null;

        if (storedPath.StartsWith("proofs/", StringComparison.OrdinalIgnoreCase))
        {
            var fileName = Path.GetFileName(storedPath);
            var primary = Path.GetFullPath(Path.Combine(GetPrivateUploadsPath(env), fileName));
            if (File.Exists(primary))
                return primary;

            // Pre-migration location when uploads lived under the deploy root.
            var legacyAppData = Path.GetFullPath(
                Path.Combine(env.ContentRootPath, "App_Data", "uploads", "proofs", fileName));
            if (File.Exists(legacyAppData))
                return legacyAppData;

            return primary;
        }

        var legacyPath = Path.GetFullPath(Path.Combine(env.WebRootPath ?? "", storedPath.TrimStart('/')));
        var webRoot = Path.GetFullPath(env.WebRootPath ?? env.ContentRootPath);
        if (!legacyPath.StartsWith(webRoot, StringComparison.OrdinalIgnoreCase))
            return null;

        return legacyPath;
    }

    public static string? ResolveProgressFilePath(IWebHostEnvironment env, string? storedPath)
    {
        if (string.IsNullOrWhiteSpace(storedPath))
            return null;

        if (!storedPath.StartsWith("progress/", StringComparison.OrdinalIgnoreCase))
            return null;

        var fileName = Path.GetFileName(storedPath);
        var primary = Path.GetFullPath(Path.Combine(GetProgressUploadsPath(env), fileName));
        var uploadsRoot = Path.GetFullPath(GetProgressUploadsPath(env));
        if (!primary.StartsWith(uploadsRoot, StringComparison.OrdinalIgnoreCase))
            return null;

        if (File.Exists(primary))
            return primary;

        var legacyAppData = Path.GetFullPath(
            Path.Combine(env.ContentRootPath, "App_Data", "uploads", "progress", fileName));
        if (File.Exists(legacyAppData))
            return legacyAppData;

        return primary;
    }
}
