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
