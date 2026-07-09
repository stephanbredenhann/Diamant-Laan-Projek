using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
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
        var emailHealth = new EmailHealthService(Options.Create(new ResendSettings()));
        var controller = new SettingsController(service, emailHealth);

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
        var emailHealth = new EmailHealthService(Options.Create(new ResendSettings()));
        var controller = new SettingsController(service, emailHealth);

        var result = await controller.GetHomeStatsSettings();

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<HomeStatsSettingsDto>(ok.Value);
        Assert.False(dto.ShowStatsSection);
        Assert.True(dto.ShowTotalRaised);
    }

    [Fact]
    public void Health_ReturnsEmailConfiguredStatus()
    {
        var service = new SiteSettingsService(CreateDb());
        var emailHealth = new EmailHealthService(Options.Create(new ResendSettings
        {
            ApiKey = "re_test",
            FromEmail = "noreply@test.com"
        }));
        var controller = new SettingsController(service, emailHealth);

        var result = controller.Health();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"emailConfigured\":true", json);
    }
}
