using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class ProfileRateLimitServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CheckAsync_AllowsUpToThreeChanges()
    {
        await using var db = CreateDb();
        var service = new ProfileRateLimitService(db);
        const string userId = "user-1";

        for (var i = 0; i < 3; i++)
        {
            var (allowed, remaining, _) = await service.CheckAsync(userId);
            Assert.True(allowed);
            Assert.Equal(3 - i, remaining);
            await service.LogAsync(userId, ProfileChangeTypes.Profile);
        }

        var after = await service.CheckAsync(userId);
        Assert.False(after.Allowed);
        Assert.Equal(0, after.Remaining);
    }

    [Fact]
    public async Task CheckAsync_IgnoresChangesOlderThanWindow()
    {
        await using var db = CreateDb();
        db.ProfileChangeLogs.Add(new ProfileChangeLog
        {
            UserId = "user-1",
            ChangeType = ProfileChangeTypes.Profile,
            CreatedAt = DateTime.UtcNow.AddHours(-13)
        });
        await db.SaveChangesAsync();

        var service = new ProfileRateLimitService(db);
        var (allowed, remaining, _) = await service.CheckAsync("user-1");
        Assert.True(allowed);
        Assert.Equal(3, remaining);
    }
}
