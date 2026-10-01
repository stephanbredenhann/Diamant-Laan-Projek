using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class SiteSettingsService
{
    private readonly AppDbContext _db;

    public SiteSettingsService(AppDbContext db) => _db = db;

    public async Task<HomeStatsSettingsDto> GetHomeStatsSettingsAsync()
    {
        var settings = await _db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        if (settings == null)
        {
            return new HomeStatsSettingsDto
            {
                ShowStatsSection = true,
                ShowTotalRaised = true
            };
        }

        return new HomeStatsSettingsDto
        {
            ShowStatsSection = settings.ShowStatsSection,
            ShowTotalRaised = settings.ShowTotalRaised
        };
    }

    /// <summary>
    /// Whether the "Koop vir 'n Stadsbouer" path is open. Missing settings row means yes, the
    /// same way the home-page toggles above default to on.
    /// </summary>
    public async Task<bool> GetStadsbouersEnabledAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        return settings?.StadsbouersEnabled ?? true;
    }

    public async Task<bool> SetStadsbouersEnabledAsync(bool enabled)
    {
        var settings = await _db.SiteSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new SiteSettings { Id = 1 };
            _db.SiteSettings.Add(settings);
        }

        settings.StadsbouersEnabled = enabled;
        await _db.SaveChangesAsync();

        return settings.StadsbouersEnabled;
    }

    /// <summary>
    /// Where "Kies vir my" should start handing out blocks. Inclusive, 0 means off.
    /// </summary>
    public async Task<KiesVirMyOffsetDto> GetKiesVirMyOffsetAsync()
    {
        var settings = await _db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        return await BuildOffsetDtoAsync(settings?.KiesVirMyOffset ?? 0);
    }

    public async Task<KiesVirMyOffsetDto> SetKiesVirMyOffsetAsync(int offset)
    {
        var settings = await _db.SiteSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new SiteSettings { Id = 1 };
            _db.SiteSettings.Add(settings);
        }

        settings.KiesVirMyOffset = offset;
        await _db.SaveChangesAsync();

        return await BuildOffsetDtoAsync(offset);
    }

    private async Task<KiesVirMyOffsetDto> BuildOffsetDtoAsync(int offset) => new()
    {
        Offset = offset,
        AvailableAtOrAboveOffset = await _db.Squares.CountAsync(
            s => s.OwnerId == null && !s.IsReserved && s.Id <= Square.MaxSaleableId && s.Id >= offset)
    };

    public async Task<HomeStatsSettingsDto> UpdateHomeStatsSettingsAsync(UpdateHomeStatsSettingsDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var settings = await _db.SiteSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new SiteSettings { Id = 1 };
            _db.SiteSettings.Add(settings);
        }

        if (dto.ShowStatsSection.HasValue)
            settings.ShowStatsSection = dto.ShowStatsSection.Value;

        if (dto.ShowTotalRaised.HasValue)
            settings.ShowTotalRaised = dto.ShowTotalRaised.Value;

        await _db.SaveChangesAsync();

        return new HomeStatsSettingsDto
        {
            ShowStatsSection = settings.ShowStatsSection,
            ShowTotalRaised = settings.ShowTotalRaised
        };
    }
}
