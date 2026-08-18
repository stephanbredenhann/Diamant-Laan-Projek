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

    [Fact]
    public async Task GetKiesVirMyOffsetAsync_WhenMissing_IsOff()
    {
        await using var db = CreateDb();

        var dto = await new SiteSettingsService(db).GetKiesVirMyOffsetAsync();

        Assert.Equal(0, dto.Offset);
    }

    /// <summary>
    /// The count is what the admin tab shows to tell when the range is about to run dry, so it
    /// has to mean the same thing PickSquares means: unowned, not reserved, on the saleable road,
    /// and at or above the offset.
    /// </summary>
    [Fact]
    public async Task SetKiesVirMyOffsetAsync_PersistsAndCountsOnlyBlocksItWouldActuallyHandOut()
    {
        await using var db = CreateDb();
        db.Squares.AddRange(
            new Square { Id = 1 },                                  // below the offset
            new Square { Id = 10 },                                 // counts
            new Square { Id = 11 },                                 // counts
            new Square { Id = 12, OwnerId = "owner-1" },            // sold
            new Square { Id = 13, IsReserved = true },              // admin-held
            new Square { Id = Square.MaxSaleableId + 1 });          // past the saleable road
        await db.SaveChangesAsync();

        var service = new SiteSettingsService(db);
        var result = await service.SetKiesVirMyOffsetAsync(10);

        Assert.Equal(10, result.Offset);
        Assert.Equal(2, result.AvailableAtOrAboveOffset);
        Assert.Equal(10, (await db.SiteSettings.SingleAsync()).KiesVirMyOffset);

        // ...and a fresh read agrees with what the write reported.
        var reread = await service.GetKiesVirMyOffsetAsync();
        Assert.Equal(10, reread.Offset);
        Assert.Equal(2, reread.AvailableAtOrAboveOffset);
    }

    [Fact]
    public async Task SetKiesVirMyOffsetAsync_LeavesTheHomeStatsFlagsAlone()
    {
        await using var db = CreateDb();
        db.SiteSettings.Add(new SiteSettings { Id = 1, ShowStatsSection = false, ShowTotalRaised = false });
        await db.SaveChangesAsync();

        await new SiteSettingsService(db).SetKiesVirMyOffsetAsync(2000);

        var fromDb = await db.SiteSettings.SingleAsync();
        Assert.Equal(2000, fromDb.KiesVirMyOffset);
        Assert.False(fromDb.ShowStatsSection);
        Assert.False(fromDb.ShowTotalRaised);
    }
}
