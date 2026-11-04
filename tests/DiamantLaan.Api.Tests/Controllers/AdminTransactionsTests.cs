using System.Security.Claims;
using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
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

    [Fact]
    public async Task ExportTransactions_ReturnsCsvOfEveryPurchaseOldestFirst()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            UserName = "buyer@test.com",
            Email = "buyer@test.com",
            FirstName = "Jan",
            LastName = "Boer, Jnr"
        };
        db.Users.Add(user);
        var builder = new Stadsbouer { Id = 7, Name = "Piet Bouer" };
        db.Stadsbouers.Add(builder);

        var paid = new Purchase
        {
            Id = 1,
            UserId = user.Id,
            User = user,
            Amount = 1000m,
            PaymentStatus = PaymentStatus.Confirmed,
            PayFastPaymentId = "pf-123",
            PurchaseDate = new DateTime(2026, 3, 15, 22, 30, 0, DateTimeKind.Utc),
            ConfirmedAt = new DateTime(2026, 3, 15, 22, 31, 0, DateTimeKind.Utc)
        };
        paid.PurchaseSquares.Add(new PurchaseSquare { SquareId = 102 });
        paid.PurchaseSquares.Add(new PurchaseSquare { SquareId = 101, StadsbouerId = builder.Id });

        var abandoned = new Purchase
        {
            Id = 2,
            UserId = user.Id,
            User = user,
            Amount = 500m,
            PaymentStatus = PaymentStatus.Cancelled,
            PurchaseDate = new DateTime(2026, 3, 10, 8, 0, 0, DateTimeKind.Utc)
        };
        abandoned.PurchaseSquares.Add(new PurchaseSquare { SquareId = 200 });

        db.Purchases.AddRange(paid, abandoned);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        AsAdmin(controller);
        var result = await controller.ExportTransactions();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.StartsWith("text/csv", file.ContentType);
        Assert.EndsWith(".csv", file.FileDownloadName);
        Assert.Equal(new byte[] { 0xEF, 0xBB, 0xBF }, file.FileContents.Take(3));

        var lines = System.Text.Encoding.UTF8.GetString(file.FileContents[3..])
            .Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(3, lines.Length);
        Assert.StartsWith("Aankoop #,Datum (SAST)", lines[0]);

        // Cancelled checkouts are part of the history too, and come first because they are older.
        Assert.StartsWith("2,2026-03-10 10:00,", lines[1]);
        Assert.Contains(",Gekanselleer,", lines[1]);

        // Times move to SAST (crossing midnight here), a comma in a name stays inside its quotes,
        // and the sponsored builder is named.
        Assert.StartsWith("1,2026-03-16 00:30,2026-03-16 00:31,,\"Jan Boer, Jnr\",buyer@test.com,PayFast,", lines[2]);
        Assert.Contains(",Bevestig,", lines[2]);
        Assert.Contains(",pf-123,2,500.00,1000.00,\"101, 102\",Piet Bouer,Nee", lines[2]);

        var audit = Assert.Single(db.AdminAuditLogs);
        Assert.Equal("ExportTransactions", audit.Action);
    }

    [Fact]
    public async Task ExportTransactions_DefusesFormulaLikeNames()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            UserName = "x@test.com",
            Email = "x@test.com",
            FirstName = "=HYPERLINK(\"http://evil\")",
            LastName = ""
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
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 1 });
        db.Purchases.Add(purchase);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        AsAdmin(controller);
        var file = Assert.IsType<FileContentResult>(await controller.ExportTransactions());
        var csv = System.Text.Encoding.UTF8.GetString(file.FileContents);

        Assert.Contains(",\"'=HYPERLINK(\"\"http://evil\"\")\",", csv);
    }

    private static void AsAdmin(AdminController controller)
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "admin-1")
        }, "TestAuth"));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
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