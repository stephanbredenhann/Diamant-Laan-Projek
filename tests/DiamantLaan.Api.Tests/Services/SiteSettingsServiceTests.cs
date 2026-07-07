using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class SiteSettingsServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetHomeStatsSettingsAsync_WhenMissing_ReturnsTrueDefaults()
    {
        await using var db = CreateDb();
        var service = new SiteSettingsService(db);

        var dto = await service.GetHomeStatsSettingsAsync();

        Assert.True(dto.ShowStatsSection);
        Assert.True(dto.ShowTotalRaised);
    }

    [Fact]
    public async Task GetHomeStatsSettingsAsync_ReturnsStoredValues()
    {
        await using var db = CreateDb();
        db.SiteSettings.Add(new SiteSettings
        {
            Id = 1,
            ShowStatsSection = false,
            ShowTotalRaised = true
        });
        await db.SaveChangesAsync();

        var service = new SiteSettingsService(db);
        var dto = await service.GetHomeStatsSettingsAsync();

        Assert.False(dto.ShowStatsSection);
        Assert.True(dto.ShowTotalRaised);
    }

    [Fact]
    public async Task UpdateHomeStatsSettingsAsync_CreatesAndPersistsValues()
    {
        await using var db = CreateDb();
        var service = new SiteSettingsService(db);

        var result = await service.UpdateHomeStatsSettingsAsync(new UpdateHomeStatsSettingsDto
        {
            ShowStatsSection = false,
            ShowTotalRaised = false
        });

        Assert.False(result.ShowStatsSection);
        Assert.False(result.ShowTotalRaised);

        var fromDb = await db.SiteSettings.SingleAsync();
        Assert.False(fromDb.ShowStatsSection);
        Assert.False(fromDb.ShowTotalRaised);
    }

    [Fact]
    public async Task UpdateHomeStatsSettingsAsync_AppliesOnlyProvidedValues()
    {
        await using var db = CreateDb();
        db.SiteSettings.Add(new SiteSettings
        {
            Id = 1,
            ShowStatsSection = true,
            ShowTotalRaised = true
        });
        await db.SaveChangesAsync();

        var service = new SiteSettingsService(db);
        var result = await service.UpdateHomeStatsSettingsAsync(new UpdateHomeStatsSettingsDto
        {
            ShowStatsSection = false
        });

        Assert.False(result.ShowStatsSection);
        Assert.True(result.ShowTotalRaised);
    }

    [Fact]
    public async Task UpdateHomeStatsSettingsAsync_NullDto_ThrowsArgumentNullException()
    {
        await using var db = CreateDb();
        var service = new SiteSettingsService(db);

        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            service.UpdateHomeStatsSettingsAsync(null!));
    }
}
