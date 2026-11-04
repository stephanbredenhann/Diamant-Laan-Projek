using System.Security.Claims;
using System.Text.Json;
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

/// <summary>
/// The pioneer flag as the certificate endpoints hand it out. These run against the real
/// two-thousand-block line, so a filler purchase of 1 999 blocks stands in for everyone who came
/// first: the next purchase crosses the line and counts in full, and everything after it does not.
/// </summary>
public class PioneerCertificateTests
{
    private const string ShareToken = "0123456789abcdef0123456789abcdef";
    private static readonly DateTime Day = new(2026, 3, 1, 9, 0, 0, DateTimeKind.Utc);

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    /// <summary>
    /// Filler buys blocks 1..1999. Early then buys 3000 and 3001 (crossing the line, so pioneer),
    /// and later 3002 (after it). Late buys 3003, after the line entirely.
    /// </summary>
    private static async Task SeedAsync(AppDbContext db)
    {
        User Buyer(string id, string first) => new()
        {
            Id = id,
            UserName = $"{id}@test.com",
            Email = $"{id}@test.com",
            FirstName = first,
            LastName = "Boer",
        };

        var early = Buyer("early", "Vroeg");
        early.ShareToken = ShareToken;
        db.Users.AddRange(Buyer("filler", "Vul"), early, Buyer("late", "Laat"));

        Purchase Buy(int id, string userId, DateTime when, params int[] squares)
        {
            var purchase = new Purchase
            {
                Id = id,
                UserId = userId,
                Amount = squares.Length * 500m,
                PaymentStatus = PaymentStatus.Confirmed,
                PurchaseDate = when,
                ConfirmedAt = when,
            };
            foreach (var square in squares)
            {
                purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = square });
                db.Squares.Add(new Square { Id = square, OwnerId = userId });
            }
            return purchase;
        }

        db.Purchases.AddRange(
            Buy(1, "filler", Day, Enumerable.Range(1, PioneerBlocks.PioneerBlockCount - 1).ToArray()),
            Buy(2, "early", Day.AddDays(1), 3000, 3001),
            Buy(3, "late", Day.AddDays(2), 3003),
            Buy(4, "early", Day.AddDays(3), 3002));
        await db.SaveChangesAsync();
    }

    private static JsonElement Json(IActionResult result)
    {
        var ok = Assert.IsType<OkObjectResult>(result);
        return JsonDocument.Parse(JsonSerializer.Serialize(ok.Value)).RootElement.Clone();
    }

    private static Dictionary<int, bool> PioneerById(JsonElement squares) =>
        squares.EnumerateArray().ToDictionary(
            s => s.GetProperty("Id").GetInt32(),
            s => s.GetProperty("IsPioneer").GetBoolean());

    [Fact]
    public async Task AdminSummary_FlagsEachBlockByItsOwnPurchase()
    {
        await using var db = CreateDb();
        await SeedAsync(db);
        var controller = AdminController(db);

        var early = PioneerById(Json(await controller.GetCertificateSummary("early")).GetProperty("Squares"));
        var late = PioneerById(Json(await controller.GetCertificateSummary("late")).GetProperty("Squares"));

        // Bought on the million, so both blocks of that purchase are pioneers; the same buyer's
        // later purchase is not.
        Assert.Equal(new Dictionary<int, bool> { [3000] = true, [3001] = true, [3002] = false }, early);
        Assert.Equal(new Dictionary<int, bool> { [3003] = false }, late);
    }

    [Fact]
    public async Task MySquares_CarriesTheFlagPerBlock()
    {
        await using var db = CreateDb();
        await SeedAsync(db);
        var controller = new MySquaresController(db, new ShareLinkService(db, Config()))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[] { new Claim(ClaimTypes.NameIdentifier, "early") }, "TestAuth"))
                }
            }
        };

        var ok = Assert.IsType<OkObjectResult>(await controller.GetMySquares());
        var squares = Assert.IsAssignableFrom<IEnumerable<MySquareDto>>(ok.Value).ToList();

        Assert.Equal([3000, 3001], squares.Where(s => s.IsPioneer).Select(s => s.Id));
        Assert.Equal([3002], squares.Where(s => !s.IsPioneer).Select(s => s.Id));
    }

    [Fact]
    public async Task ShareLink_ListsThePioneerBlocksAndDatesThemFromTheirOwnPurchase()
    {
        await using var db = CreateDb();
        await SeedAsync(db);
        var shares = new ShareLinkService(db, Config());

        var summary = await shares.FindCertificateAsync(ShareToken);
        Assert.NotNull(summary);
        Assert.Equal([3000, 3001, 3002], summary!.Blocks);
        Assert.Equal([3000, 3001], summary.PioneerBlockIds);
        Assert.Equal(Day.AddDays(1), summary.PioneerPurchaseDate);
        Assert.Equal(Day.AddDays(3), summary.PurchaseDate);

        var later = await shares.FindCertificateAsync(ShareToken, 3002);
        Assert.Empty(later!.PioneerBlockIds);
        Assert.Null(later.PioneerPurchaseDate);

        var pioneer = await shares.FindCertificateAsync(ShareToken, 3001);
        Assert.Equal([3001], pioneer!.PioneerBlockIds);
    }

    [Fact]
    public async Task StadsbouerSummary_FlagsBlocksBoughtBeforeTheLine()
    {
        await using var db = CreateDb();
        await SeedAsync(db);
        db.Stadsbouers.Add(new Stadsbouer { Id = 7, Name = "Bouer" });
        // Sponsor rows on the early purchase (pioneer) and on the late one (not).
        foreach (var ps in db.PurchaseSquares.Where(ps => ps.SquareId == 3001 || ps.SquareId == 3003))
            ps.StadsbouerId = 7;
        await db.SaveChangesAsync();

        var squares = PioneerById(Json(await AdminController(db).GetStadsbouerCertificateSummary(7)).GetProperty("Squares"));

        Assert.Equal(new Dictionary<int, bool> { [3001] = true, [3003] = false }, squares);
    }

    private static IConfiguration Config() =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["App:PublicUrl"] = "https://diamantlaan.example"
        }).Build();

    private static AdminController AdminController(AppDbContext db)
    {
        var config = new ConfigurationBuilder().Build();
        var env = Mock.Of<IWebHostEnvironment>();
        var blockNotifications = new BlockNotificationService(
            db, Mock.Of<IEmailService>(), config, Mock.Of<ILogger<BlockNotificationService>>());
        var saveUndo = new AdminSaveUndoService(
            db, blockNotifications, env, Mock.Of<ILogger<AdminSaveUndoService>>());
        var store = new Mock<IUserStore<User>>();
        var userManager = new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        return new AdminController(
            db,
            userManager.Object,
            env,
            new AuditLogService(db),
            new SiteSettingsService(db),
            blockNotifications,
            saveUndo,
            new EmailOutboxService(db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>()),
            config);
    }
}
