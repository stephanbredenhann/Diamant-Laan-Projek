namespace DiamantLaan.Api.Services;

/// <summary>
/// Serves the Angular shell (wwwroot/index.html) by reading the file to its end on every request.
///
/// The static file middleware takes Content-Length and Last-Modified from the file's directory
/// metadata. On App Service that metadata went stale for index.html (it kept reporting the old
/// 5006-byte, 26 Oct file after newer deploys), so browsers got the new content cut off at the old
/// length, before the script tags, and every page rendered blank. Reading through an open handle
/// until EOF never trusts that metadata. The file is ~5 KB, so reading it per request is free.
/// </summary>
public class SpaIndexHtml
{
    private readonly string _path;

    public SpaIndexHtml(string webRootPath)
    {
        _path = Path.Combine(webRootPath, "index.html");
    }

    /// <summary>The current index.html, or null when the SPA was not built into wwwroot.</summary>
    public string? Read()
    {
        try
        {
            // FileShare.ReadWrite keeps .NET from caching the file length on the handle.
            using var stream = new FileStream(_path, FileMode.Open, FileAccess.Read,
                FileShare.ReadWrite | FileShare.Delete, bufferSize: 1, FileOptions.SequentialScan);
            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        }
        catch (FileNotFoundException)
        {
            return null;
        }
        catch (DirectoryNotFoundException)
        {
            return null;
        }
    }
}
