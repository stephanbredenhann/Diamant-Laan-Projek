using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class BlockNotificationServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static BlockNotificationService CreateService(AppDbContext db, Mock<IEmailService> email)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:PublicUrl"] = "http://localhost:4200"
            })
            .Build();
        return new BlockNotificationService(db, email.Object, config, NullLogger<BlockNotificationService>.Instance);
    }

    [Fact]
    public async Task QueueOwnersAsync_DebouncesByUpdatingLastQueuedAt()
    {
        await using var db = CreateDb();
        var email = new Mock<IEmailService>();
        var service = CreateService(db, email);

        await service.QueueOwnersAsync(new[] { "u1" });
        var first = await db.PendingBlockNotifications.SingleAsync();
        var firstQueued = first.FirstQueuedAt;
        await Task.Delay(5);
        await service.QueueOwnersAsync(new[] { "u1" });
        var second = await db.PendingBlockNotifications.SingleAsync();

        Assert.Equal(firstQueued, second.FirstQueuedAt);
        Assert.True(second.LastQueuedAt >= first.LastQueuedAt);
        Assert.False(second.Sent);
    }

    [Fact]
    public async Task QueueOwnersAsync_RearmsPreviouslySentRow()
    {
        await using var db = CreateDb();
        var previouslySentAt = DateTime.UtcNow.AddMinutes(-30);
        db.PendingBlockNotifications.Add(new PendingBlockNotification
        {
            UserId = "u1",
            FirstQueuedAt = previouslySentAt,
            LastQueuedAt = previouslySentAt,
            Sent = true
        });
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        var service = CreateService(db, email);
        await service.QueueOwnersAsync(new[] { "u1" });

        var row = await db.PendingBlockNotifications.SingleAsync();
        Assert.False(row.Sent);
        Assert.True(row.LastQueuedAt > previouslySentAt);
        Assert.True(row.FirstQueuedAt > previouslySentAt);
    }

    [Fact]
    public async Task FlushDueAsync_SkipsOptedOutUsers()
    {
        await using var db = CreateDb();
        db.Users.Add(new User
        {
            Id = "u1",
            UserName = "a@b.com",
            Email = "a@b.com",
            FirstName = "Ann",
            LastName = "Bee",
            ReceiveBlockProgressEmails = false,
            NormalizedEmail = "A@B.COM",
            NormalizedUserName = "A@B.COM"
        });
        db.Squares.Add(new Square { Id = 1, OwnerId = "u1", Status = SquareStatus.Voorberei });
        db.PendingBlockNotifications.Add(new PendingBlockNotification
        {
            UserId = "u1",
            FirstQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            LastQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            Sent = false
        });
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        var service = CreateService(db, email);
        await service.FlushDueAsync(forceAll: true);

        email.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.True((await db.PendingBlockNotifications.SingleAsync()).Sent);
    }

    [Fact]
    public async Task FlushDueAsync_SendsOneEmailForUserWithMultipleBlocks()
    {
        await using var db = CreateDb();
        db.Users.Add(new User
        {
            Id = "u1",
            UserName = "a@b.com",
            Email = "a@b.com",
            FirstName = "Ann",
            LastName = "Bee",
            ReceiveBlockProgressEmails = true,
            NormalizedEmail = "A@B.COM",
            NormalizedUserName = "A@B.COM"
        });
        db.Squares.AddRange(
            new Square { Id = 1, OwnerId = "u1", Status = SquareStatus.BesigOmTeTeer },
            new Square { Id = 2, OwnerId = "u1", Status = SquareStatus.Voorberei }
        );
        db.PendingBlockNotifications.Add(new PendingBlockNotification
        {
            UserId = "u1",
            FirstQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            LastQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            Sent = false
        });
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var service = CreateService(db, email);
        await service.FlushDueAsync(forceAll: true);

        email.Verify(e => e.SendAsync(
            "a@b.com",
            It.Is<string>(s => s.Contains("blokke")),
            It.Is<string>(html => html.Contains("Besig om te teer") && html.Contains("Voorberei")),
            null,
            It.IsAny<CancellationToken>()), Times.Once);
        Assert.True((await db.PendingBlockNotifications.SingleAsync()).Sent);
    }
}
