using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

public class AdminCertificateSummaryTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetCertificateSummary_ReturnsAccountNameAndOwnedSquares_IgnoresCertificateName()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            UserName = "buyer@test.com",
            Email = "buyer@test.com",
            FirstName = "Jan",
            LastName = "Boer",
            CertificateName = "Sertifikaat Naam"
        };
        db.Users.Add(user);

        var boughtAt = new DateTime(2026, 3, 15, 10, 0, 0, DateTimeKind.Utc);
        db.Squares.AddRange(
            new Square { Id = 101, OwnerId = user.Id, CertificateName = "Blok Naam" },
            new Square { Id = 102, OwnerId = user.Id },
            new Square { Id = 999, OwnerId = "other" });

        var purchase = new Purchase
        {
            Id = 1,
            UserId = user.Id,
            User = user,
            Amount = 1000m,
            PaymentStatus = PaymentStatus.Confirmed,
            PurchaseDate = boughtAt
        };
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 101 });
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 102 });
        db.Purchases.Add(purchase);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.GetCertificateSummary(user.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.Equal("Jan Boer", root.GetProperty("OwnerName").GetString());
        var squares = root.GetProperty("Squares").EnumerateArray().ToList();
        Assert.Equal(2, squares.Count);
        Assert.Equal(101, squares[0].GetProperty("Id").GetInt32());
        Assert.Equal(102, squares[1].GetProperty("Id").GetInt32());
        Assert.DoesNotContain("Sertifikaat", root.GetProperty("OwnerName").GetString());
    }

    [Fact]
    public async Task GetCertificateSummary_UnknownUser_ReturnsNotFound()
    {
        await using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.GetCertificateSummary("missing");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    private static Mock<UserManager<User>> CreateUserManagerMock()
    {
        var store = new Mock<IUserStore<User>>();
        return new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
    }

    private static AdminController CreateController(AppDbContext db)
    {
        var config = new ConfigurationBuilder().Build();
        var env = Mock.Of<IWebHostEnvironment>();
        var blockNotifications = new BlockNotificationService(
            db,
            Mock.Of<IEmailService>(),
            config,
            Mock.Of<ILogger<BlockNotificationService>>());
        var saveUndo = new AdminSaveUndoService(
            db,
            blockNotifications,
            env,
            Mock.Of<ILogger<AdminSaveUndoService>>());

        return new AdminController(
            db,
            CreateUserManagerMock().Object,
            env,
            new AuditLogService(db),
            new SiteSettingsService(db),
            blockNotifications,
            saveUndo,
            new EmailOutboxService(db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>()),
            config);
    }
}
