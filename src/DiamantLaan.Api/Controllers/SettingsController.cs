using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly SiteSettingsService _siteSettings;
    private readonly EmailHealthService _emailHealth;

    public SettingsController(SiteSettingsService siteSettings, EmailHealthService emailHealth)
    {
        _siteSettings = siteSettings;
        _emailHealth = emailHealth;
    }

    [HttpGet("home-stats")]
    public async Task<IActionResult> GetHomeStatsSettings()
    {
        return Ok(await _siteSettings.GetHomeStatsSettingsAsync());
    }

    /// <summary>Read before the /bou wizard offers the option, so it can hide it.</summary>
    [HttpGet("stadsbouers")]
    public async Task<IActionResult> GetStadsbouersEnabled(CancellationToken cancellationToken)
    {
        return Ok(new { enabled = await _siteSettings.GetStadsbouersEnabledAsync(cancellationToken) });
    }

    [HttpGet("/api/health")]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "ok",
            emailConfigured = _emailHealth.IsConfigured
        });
    }
}
