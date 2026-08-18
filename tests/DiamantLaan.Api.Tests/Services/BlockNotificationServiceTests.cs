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

        await service.QueueOwnersAsync(new[] { "u1" }, SquareStatus.Voorberei);
        var first = await db.PendingBlockNotifications.SingleAsync();
        var firstQueued = first.FirstQueuedAt;
        await Task.Delay(5);
        await service.QueueOwnersAsync(new[] { "u1" }, SquareStatus.Voorberei);
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
        await service.QueueOwnersAsync(new[] { "u1" }, SquareStatus.Voorberei);

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
        var pending = new PendingBlockNotification
        {
            UserId = "u1",
            FirstQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            LastQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            Sent = false
        };
        pending.AddStatus(SquareStatus.Voorberei);
        db.PendingBlockNotifications.Add(pending);
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        var service = CreateService(db, email);
        await service.FlushDueAsync(forceAll: true);

        email.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.True((await db.PendingBlockNotifications.SingleAsync()).Sent);
    }

    [Fact]
    public async Task FlushDueAsync_SendsOneEmailPerTouchedStatus_ListingOnlyThatStatusBlocks()
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
            new Square { Id = 2, OwnerId = "u1", Status = SquareStatus.Voorberei },
            // Untouched status: must not be mentioned in either email.
            new Square { Id = 3, OwnerId = "u1", Status = SquareStatus.KlaarGeteer }
        );
        var pending = new PendingBlockNotification
        {
            UserId = "u1",
            FirstQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            LastQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            Sent = false
        };
        pending.AddStatus(SquareStatus.Voorberei);
        pending.AddStatus(SquareStatus.BesigOmTeTeer);
        db.PendingBlockNotifications.Add(pending);
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var service = CreateService(db, email);
        await service.FlushDueAsync(forceAll: true);

        email.Verify(e => e.SendAsync(
            "a@b.com",
            "Orania Oewerpad: Vordering op jou blokkie!",
            It.Is<string>(html => html.Contains("<strong>#2</strong>") && !html.Contains("<strong>#1</strong>") && !html.Contains("<strong>#3</strong>")),
            null,
            It.IsAny<CancellationToken>()), Times.Once);
        email.Verify(e => e.SendAsync(
            "a@b.com",
            "Orania Oewerpad: Jou blokkie word geteer!",
            It.Is<string>(html => html.Contains("<strong>#1</strong>") && !html.Contains("<strong>#2</strong>") && !html.Contains("<strong>#3</strong>")),
            null,
            It.IsAny<CancellationToken>()), Times.Once);
        Assert.True((await db.PendingBlockNotifications.SingleAsync()).Sent);
    }

    [Fact]
    public async Task FlushDueAsync_LeavesRowArmedWhenOneStatusEmailFails()
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
            new Square { Id = 1, OwnerId = "u1", Status = SquareStatus.Voorberei },
            new Square { Id = 2, OwnerId = "u1", Status = SquareStatus.KlaarGeteer }
        );
        var pending = new PendingBlockNotification
        {
            UserId = "u1",
            FirstQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            LastQueuedAt = DateTime.UtcNow.AddMinutes(-20),
            Sent = false
        };
        pending.AddStatus(SquareStatus.Voorberei);
        pending.AddStatus(SquareStatus.KlaarGeteer);
        db.PendingBlockNotifications.Add(pending);
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        email.Setup(e => e.SendAsync(It.IsAny<string>(), It.Is<string>(s => s.Contains("voltooi")), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var service = CreateService(db, email);
        await service.FlushDueAsync(forceAll: true);

        Assert.False((await db.PendingBlockNotifications.SingleAsync()).Sent);
    }

    [Fact]
    public async Task QueueOwnersAsync_AccumulatesStatusesUntilSent()
    {
        await using var db = CreateDb();
        var email = new Mock<IEmailService>();
        var service = CreateService(db, email);

        await service.QueueOwnersAsync(new[] { "u1" }, SquareStatus.Voorberei);
        await service.QueueOwnersAsync(new[] { "u1" }, SquareStatus.KlaarGeteer);
        await service.QueueOwnersAsync(new[] { "u1" }, SquareStatus.Voorberei);

        var row = await db.PendingBlockNotifications.SingleAsync();
        Assert.Equal(
            new[] { SquareStatus.Voorberei, SquareStatus.KlaarGeteer },
            row.ParsedStatuses().ToArray());
    }

    [Fact]
    public async Task QueueOwnersAsync_ClearsStatusesWhenRearmingSentRow()
    {
        await using var db = CreateDb();
        var stale = new PendingBlockNotification
        {
            UserId = "u1",
            FirstQueuedAt = DateTime.UtcNow.AddHours(-2),
            LastQueuedAt = DateTime.UtcNow.AddHours(-2),
            Sent = true
        };
        stale.AddStatus(SquareStatus.Voorberei);
        db.PendingBlockNotifications.Add(stale);
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        var service = CreateService(db, email);
        await service.QueueOwnersAsync(new[] { "u1" }, SquareStatus.KlaarGeteer);

        var row = await db.PendingBlockNotifications.SingleAsync();
        Assert.Equal(new[] { SquareStatus.KlaarGeteer }, row.ParsedStatuses().ToArray());
    }

    [Fact]
    public async Task QueueOwnersAsync_RearmsExistingSentRow_WithoutDuplicateInsert()
    {
        await using var db = CreateDb();
        db.PendingBlockNotifications.Add(new PendingBlockNotification
        {
            UserId = "u1",
            FirstQueuedAt = DateTime.UtcNow.AddHours(-2),
            LastQueuedAt = DateTime.UtcNow.AddHours(-2),
            Sent = true
        });
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        var service = CreateService(db, email);
        await service.QueueOwnersAsync(new[] { "u1" }, SquareStatus.Voorberei);

        var row = await db.PendingBlockNotifications.SingleAsync();
        Assert.Equal("u1", row.UserId);
        Assert.False(row.Sent);
        Assert.True(row.LastQueuedAt > DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task CancelPendingAsync_RemovesUnsentRows_LeavesSentAlone()
    {
        await using var db = CreateDb();
        db.PendingBlockNotifications.AddRange(
            new PendingBlockNotification
            {
                UserId = "u1",
                FirstQueuedAt = DateTime.UtcNow,
                LastQueuedAt = DateTime.UtcNow,
                Sent = false
            },
            new PendingBlockNotification
            {
                UserId = "u2",
                FirstQueuedAt = DateTime.UtcNow,
                LastQueuedAt = DateTime.UtcNow,
                Sent = true
            },
            new PendingBlockNotification
            {
                UserId = "u3",
                FirstQueuedAt = DateTime.UtcNow,
                LastQueuedAt = DateTime.UtcNow,
                Sent = false
            });
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        var service = CreateService(db, email);
        await service.CancelPendingAsync(new[] { "u1", "u2" });

        var remaining = await db.PendingBlockNotifications.OrderBy(p => p.UserId).ToListAsync();
        Assert.Equal(2, remaining.Count);
        Assert.Equal("u2", remaining[0].UserId);
        Assert.True(remaining[0].Sent);
        Assert.Equal("u3", remaining[1].UserId);
        Assert.False(remaining[1].Sent);
    }
}
