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

    [HttpGet("{token}")]
    public async Task<IActionResult> Page(string token)
    {
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

    private string Origin() =>
        ControllerContext.HttpContext != null
            ? ShareLinkService.OriginFrom(Request, _shareLinks.PublicBaseUrl)
            : _shareLinks.PublicBaseUrl;
}
