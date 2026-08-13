using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DiamantLaan.Api.Controllers;

[Route("deel")]
[AllowAnonymous]
public class SharePageController : ControllerBase
{
    private readonly ShareLinkService _shareLinks;
    private readonly ShareOgImageService _ogImages;
    private readonly SharePageRenderer _pages;

    public SharePageController(
        ShareLinkService shareLinks,
        ShareOgImageService ogImages,
        SharePageRenderer pages)
    {
        _shareLinks = shareLinks;
        _ogImages = ogImages;
        _pages = pages;
    }

    /// <summary>
    /// Link previews (WhatsApp, Facebook, ...) do not run JavaScript, so they get a server-rendered
    /// shell that carries nothing but the Open Graph tags. People get the Angular app, which draws
    /// the real certificate with the same component the owner sees. An unlisted crawler falls
    /// through to the app and shows the site's generic preview, which is a dull card, not a break.
    /// </summary>
    private static readonly string[] PreviewBots =
    [
        "facebookexternalhit", "facebookcatalog", "whatsapp", "twitterbot", "linkedinbot",
        "slackbot", "telegrambot", "discordbot", "pinterest", "redditbot", "applebot",
        "skypeuripreview", "vkshare", "embedly", "googlebot", "bingbot", "developers.google.com/+/web/snippet"
    ];

    [HttpGet("{token}")]
    public async Task<IActionResult> Page(string token)
    {
        if (!IsPreviewBot()) return File("~/index.html", "text/html");

        var origin = Origin();
        var share = await _shareLinks.FindPublicAsync(token);
        if (share == null)
            return new ContentResult
            {
                StatusCode = StatusCodes.Status404NotFound,
                ContentType = "text/html; charset=utf-8",
                Content = SharePageRenderer.NotFoundHtml(origin)
            };

        var pageUrl = _shareLinks.PageUrl(share.Value.Token, origin);
        var imageUrl = _shareLinks.ImageUrl(share.Value.Token, share.Value.MeterCount, origin);
        var html = _pages.Render(
            share.Value.FirstName,
            share.Value.MeterCount,
            pageUrl,
            imageUrl,
            origin,
            origin.TrimEnd('/') + "/bou");

        return Content(html, "text/html; charset=utf-8");
    }

    [HttpGet("{token}/og.jpg")]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> OgImage(string token)
    {
        var share = await _shareLinks.FindPublicAsync(token);
        if (share == null) return NotFound();

        var jpeg = _ogImages.Render(share.Value.FirstName, share.Value.MeterCount);
        if (ControllerContext.HttpContext != null)
            Response.Headers.CacheControl = "public, max-age=3600";
        return File(jpeg, "image/jpeg");
    }

    /// <summary>The certificate data behind a public link. Anonymous by design: the token is the key.</summary>
    [HttpGet("/api/deel/{token}/sertifikaat")]
    public async Task<IActionResult> Certificate(string token)
    {
        var cert = await _shareLinks.FindCertificateAsync(token);
        if (cert == null) return NotFound();

        return Ok(new
        {
            name = cert.Name,
            firstName = cert.FirstName,
            blocks = cert.Blocks,
            purchaseDate = cert.PurchaseDate?.ToString("yyyy-MM-dd")
        });
    }

    private bool IsPreviewBot()
    {
        var agent = ControllerContext.HttpContext?.Request.Headers.UserAgent.ToString();
        return !string.IsNullOrEmpty(agent)
            && PreviewBots.Any(b => agent.Contains(b, StringComparison.OrdinalIgnoreCase));
    }

    private string Origin() =>
        ControllerContext.HttpContext != null
            ? ShareLinkService.OriginFrom(Request, _shareLinks.PublicBaseUrl)
            : _shareLinks.PublicBaseUrl;
}
