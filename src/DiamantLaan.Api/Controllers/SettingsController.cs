using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly SiteSettingsService _siteSettings;

    public SettingsController(SiteSettingsService siteSettings)
    {
        _siteSettings = siteSettings;
    }

    [HttpGet("home-stats")]
    public async Task<IActionResult> GetHomeStatsSettings()
    {
        return Ok(await _siteSettings.GetHomeStatsSettingsAsync());
    }
}
