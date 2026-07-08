using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
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

public class AdminTransactionsTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetTransactions_ReturnsAllPurchasesWithBuyerInfo()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            UserName = "buyer@test.com",
            Email = "buyer@test.com",
            FirstName = "Jan",
            LastName = "Boer"
        };
        db.Users.Add(user);

        var purchase = new Purchase
        {
            Id = 1,
            UserId = user.Id,
            User = user,
            Amount = 1000m,
            PaymentStatus = PaymentStatus.Confirmed,
            PurchaseDate = DateTime.UtcNow
        };
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 101 });
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 102 });
        db.Purchases.Add(purchase);
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.GetTransactions();

        var ok = Assert.IsType<OkObjectResult>(result);
        var rows = Assert.IsAssignableFrom<IEnumerable<PurchaseTransactionDto>>(ok.Value);
        var list = rows.ToList();
        Assert.Single(list);
        Assert.Equal("Jan Boer", list[0].UserName);
        Assert.Equal("buyer@test.com", list[0].UserEmail);
        Assert.Equal(2, list[0].SquareCount);
    }

    [Fact]
    public async Task GetTransactions_WorksAgainstProjectSqliteDatabase()
    {
        var dbPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "src", "DiamantLaan.Api", "diamantlaan.db"));

        if (!File.Exists(dbPath))
            return;

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite($"Data Source={dbPath}")
            .Options;

        await using var db = new AppDbContext(options);
        var controller = CreateController(db);

        var result = await controller.GetTransactions();

        var ok = Assert.IsType<OkObjectResult>(result);
        var rows = Assert.IsAssignableFrom<IEnumerable<PurchaseTransactionDto>>(ok.Value);
        Assert.NotEmpty(rows);
    }

    [Fact]
    public async Task GetTransactions_SerializesCamelCaseJson()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            UserName = "buyer@test.com",
            Email = "buyer@test.com",
            FirstName = "Jan",
            LastName = "Boer"
        };
        db.Users.Add(user);

        var purchase = new Purchase
        {
            Id = 1,
            UserId = user.Id,
            User = user,
            Amount = 500m,
            PaymentStatus = PaymentStatus.Confirmed,
            PurchaseDate = DateTime.UtcNow
        };
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 101 });
        db.Purchases.Add(purchase);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.GetTransactions();
        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));
        Assert.Contains("\"squareIds\"", json);
        Assert.Contains("\"amountPerBlock\":500", json);
        Assert.Contains("\"purchaseSource\"", json);
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
        var blockNotifications = new BlockNotificationService(
            db,
            Mock.Of<IEmailService>(),
            config,
            Mock.Of<ILogger<BlockNotificationService>>());

        return new AdminController(
            db,
            CreateUserManagerMock().Object,
            Mock.Of<IWebHostEnvironment>(),
            new AuditLogService(db),
            new SiteSettingsService(db),
            blockNotifications,
            Mock.Of<IEmailService>(),
            config);
    }
}
