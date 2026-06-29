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

    public static string GetPrivateUploadsPath(IWebHostEnvironment env)
    {
        var path = Path.Combine(env.ContentRootPath, "App_Data", "uploads", "proofs");
        Directory.CreateDirectory(path);
        return path;
    }

    public static string GetProgressUploadsPath(IWebHostEnvironment env)
    {
        var path = Path.Combine(env.ContentRootPath, "App_Data", "uploads", "progress");
        Directory.CreateDirectory(path);
        return path;
    }

    public static string? ResolveProofFilePath(IWebHostEnvironment env, string? storedPath)
    {
        if (string.IsNullOrWhiteSpace(storedPath))
            return null;

        if (storedPath.StartsWith("proofs/", StringComparison.OrdinalIgnoreCase))
            return Path.GetFullPath(Path.Combine(GetPrivateUploadsPath(env), Path.GetFileName(storedPath)));

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
        var fullPath = Path.GetFullPath(Path.Combine(GetProgressUploadsPath(env), fileName));
        var uploadsRoot = Path.GetFullPath(GetProgressUploadsPath(env));
        if (!fullPath.StartsWith(uploadsRoot, StringComparison.OrdinalIgnoreCase))
            return null;

        return fullPath;
    }
}
