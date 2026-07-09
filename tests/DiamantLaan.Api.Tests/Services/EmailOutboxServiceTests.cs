using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class EmailOutboxServiceTests
{
    [Fact]
    public async Task FlushPendingAsync_RetriesUntilSendSucceeds()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new AppDbContext(options);

        var email = new Mock<IEmailService>();
        var attempts = 0;
        email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                attempts++;
                return attempts >= 2;
            });

        var outbox = new EmailOutboxService(db, email.Object, Mock.Of<ILogger<EmailOutboxService>>());
        await outbox.QueueAsync("user@test.com", "Subject", "<p>Hi</p>", "test-key-1");

        var pending = await db.PendingEmails.SingleAsync();
        Assert.False(pending.Sent);

        await outbox.FlushPendingAsync();

        pending = await db.PendingEmails.SingleAsync();
        Assert.True(pending.Sent);
        Assert.Equal(2, pending.AttemptCount);
    }
}
