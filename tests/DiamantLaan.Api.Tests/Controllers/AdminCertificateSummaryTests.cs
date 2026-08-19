using System.Security.Claims;
using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Models.Dtos;
using Microsoft.AspNetCore.Http;
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
    public async Task GetCertificateSummary_ReturnsCertificateNamesAndOwnedSquares()
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

        // The admin download prints what the buyer sees, so the chosen certificate name wins over
        // the account name, and a block with no name of its own falls back to it.
        Assert.Equal("Sertifikaat Naam", root.GetProperty("OwnerName").GetString());
        Assert.True(root.GetProperty("SameForAll").GetBoolean());
        var squares = root.GetProperty("Squares").EnumerateArray().ToList();
        Assert.Equal(2, squares.Count);
        Assert.Equal(101, squares[0].GetProperty("Id").GetInt32());
        Assert.Equal("Blok Naam", squares[0].GetProperty("OwnerName").GetString());
        Assert.Equal(102, squares[1].GetProperty("Id").GetInt32());
        Assert.Equal("Sertifikaat Naam", squares[1].GetProperty("OwnerName").GetString());
    }

    [Fact]
    public async Task GetCertificateSummary_NoCertificateName_FallsBackToAccountName()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            UserName = "buyer@test.com",
            Email = "buyer@test.com",
            FirstName = "Jan",
            LastName = "Boer",
            CertificateIndividual = true
        };
        db.Users.Add(user);
        db.Squares.Add(new Square { Id = 101, OwnerId = user.Id });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.GetCertificateSummary(user.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.Equal("Jan Boer", root.GetProperty("OwnerName").GetString());
        Assert.False(root.GetProperty("SameForAll").GetBoolean());
        var squares = root.GetProperty("Squares").EnumerateArray().ToList();
        Assert.Equal("Jan Boer", squares[0].GetProperty("OwnerName").GetString());
    }

    [Fact]
    public async Task GetCertificateSummary_UnknownUser_ReturnsNotFound()
    {
        await using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.GetCertificateSummary("missing");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task SaveCertificateNames_GuestWithNoName_SetsOneNameOnEverySheet()
    {
        await using var db = CreateDb();
        // A guest checkout: no account name, no certificate name, nothing to print.
        db.Users.Add(new User { Id = "g1", UserName = "gas@test.com", Email = "gas@test.com", IsGuest = true });
        db.Squares.AddRange(
            new Square { Id = 101, OwnerId = "g1", CertificateName = "ou naam" },
            new Square { Id = 102, OwnerId = "g1" });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.SaveCertificateNames("g1", new SaveCertificateNamesDto
        {
            SameForAll = true,
            SummaryName = "  Anna Botha  "
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        var root = Json(ok);
        Assert.Equal("Anna Botha", root.GetProperty("OwnerName").GetString());
        Assert.True(root.GetProperty("SameForAll").GetBoolean());
        // Every block prints the one name, so no block keeps a name of its own.
        Assert.All(root.GetProperty("Squares").EnumerateArray(),
            sq => Assert.Equal("Anna Botha", sq.GetProperty("OwnerName").GetString()));
        Assert.All(await db.Squares.Where(s => s.OwnerId == "g1").ToListAsync(),
            s => Assert.Null(s.CertificateName));
    }

    [Fact]
    public async Task SaveCertificateNames_Individual_KeepsPerBlockNamesAndFallsBack()
    {
        await using var db = CreateDb();
        db.Users.Add(new User { Id = "g1", UserName = "gas@test.com", Email = "gas@test.com", IsGuest = true });
        db.Squares.AddRange(
            new Square { Id = 101, OwnerId = "g1" },
            new Square { Id = 102, OwnerId = "g1" },
            new Square { Id = 999, OwnerId = "other" });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.SaveCertificateNames("g1", new SaveCertificateNamesDto
        {
            SameForAll = false,
            SummaryName = "Anna Botha",
            Blocks =
            {
                new BlockCertificateNameDto { SquareId = 101, Name = "Klein Anna" },
                // Blank falls back to the summary name; a block owned by someone else is ignored.
                new BlockCertificateNameDto { SquareId = 102, Name = " " },
                new BlockCertificateNameDto { SquareId = 999, Name = "Kaper" }
            }
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        var squares = Json(ok).GetProperty("Squares").EnumerateArray().ToList();
        Assert.Equal("Klein Anna", squares[0].GetProperty("OwnerName").GetString());
        Assert.Equal("Anna Botha", squares[1].GetProperty("OwnerName").GetString());
        Assert.Null((await db.Squares.FindAsync(999))!.CertificateName);
    }

    [Fact]
    public async Task SaveCertificateNames_BlankName_ReturnsBadRequest()
    {
        await using var db = CreateDb();
        db.Users.Add(new User { Id = "g1", UserName = "gas@test.com", Email = "gas@test.com" });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.SaveCertificateNames("g1", new SaveCertificateNamesDto
        {
            SameForAll = true,
            SummaryName = "A"
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    private static System.Text.Json.JsonElement Json(OkObjectResult ok)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        return System.Text.Json.JsonDocument.Parse(json).RootElement.Clone();
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

        var controller = new AdminController(
            db,
            CreateUserManagerMock().Object,
            env,
            new AuditLogService(db),
            new SiteSettingsService(db),
            blockNotifications,
            saveUndo,
            new EmailOutboxService(db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>()),
            config);

        // The name-fix endpoint writes an audit row, which needs an admin on the request.
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, "admin1") }, "TestAuth"));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        return controller;
    }
}
