using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

public class SettingsControllerTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetHomeStatsSettings_WhenMissing_ReturnsDefaults()
    {
        await using var db = CreateDb();
        var service = new SiteSettingsService(db);
        var controller = new SettingsController(service);

        var result = await controller.GetHomeStatsSettings();

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<HomeStatsSettingsDto>(ok.Value);
        Assert.True(dto.ShowStatsSection);
        Assert.True(dto.ShowTotalRaised);
    }

    [Fact]
    public async Task GetHomeStatsSettings_ReturnsStoredValues()
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
        var controller = new SettingsController(service);

        var result = await controller.GetHomeStatsSettings();

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<HomeStatsSettingsDto>(ok.Value);
        Assert.False(dto.ShowStatsSection);
        Assert.True(dto.ShowTotalRaised);
    }
}
