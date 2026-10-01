using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

/// <summary>
/// The public gallery of road builders you can sponsor a block for. Read-only and anonymous:
/// the /bou wizard reaches it before anyone signs in. Email addresses never leave here.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class StadsbouersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly SiteSettingsService _siteSettings;
    private readonly IWebHostEnvironment _env;

    public StadsbouersController(AppDbContext db, SiteSettingsService siteSettings, IWebHostEnvironment env)
    {
        _db = db;
        _siteSettings = siteSettings;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        // Switched off by an admin: answer with nothing rather than 404, so the page falls back
        // to its "no builders yet" state instead of an error.
        if (!await _siteSettings.GetStadsbouersEnabledAsync(cancellationToken))
            return Ok(Array.Empty<StadsbouerDto>());

        var taken = await StadsbouerSponsorshipService.GetAvailabilityAsync(_db, cancellationToken);

        var builders = await _db.Stadsbouers
            .Where(s => s.IsActive)
            .OrderBy(s => s.Id)
            .Select(s => new StadsbouerDto
            {
                Id = s.Id,
                Name = s.Name,
                Title = s.Title,
                About = s.About,
                HasPhoto = s.PhotoPath != null
            })
            .ToListAsync(cancellationToken);

        foreach (var builder in builders)
        {
            builder.IsSponsored = taken.Sponsored.Contains(builder.Id);
            builder.IsPending = taken.Pending.Contains(builder.Id);
        }

        return Ok(builders);
    }

    [HttpGet("{id}/foto")]
    public async Task<IActionResult> GetPhoto(int id, CancellationToken cancellationToken)
    {
        // Same rule as the gallery: a hidden builder's photo is hidden too. Admins use AdminController's copy.
        if (!await _siteSettings.GetStadsbouersEnabledAsync(cancellationToken))
            return NotFound();

        var storedPath = await _db.Stadsbouers
            .Where(s => s.Id == id && s.IsActive)
            .Select(s => s.PhotoPath)
            .FirstOrDefaultAsync(cancellationToken);

        var filePath = FileUploadService.ResolveStadsbouerFilePath(_env, storedPath);
        if (filePath == null || !System.IO.File.Exists(filePath))
            return NotFound();

        var contentType = FileUploadService.GetContentTypeFromExtension(Path.GetExtension(filePath));
        return PhysicalFile(filePath, contentType);
    }
}
