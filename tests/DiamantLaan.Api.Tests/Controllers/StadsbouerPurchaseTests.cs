using System.Security.Claims;
using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

/// <summary>
/// Buying a block for a road builder. The pairing is by index, and a builder who is already
/// spoken for has to be refused before any money moves.
/// </summary>
public class StadsbouerPurchaseTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;

    public StadsbouerPurchaseTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _db = new AppDbContext(options);
        _db.Database.Migrate();
        _db.Users.Add(new User { Id = "koper", UserName = "koper@test.com", Email = "koper@test.com" });
        _db.SaveChanges();

        _userManager = CreateUserManager(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task CreatePurchase_PairsEachBlockWithItsBuilderByIndex()
    {
        SeedSquares(10, 11);
        var eerste = Seed("Eerste Bouer");
        var tweede = Seed("Tweede Bouer");

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 10, 11 },
            StadsbouerIds = new List<int> { eerste.Id, tweede.Id }
        });

        Assert.IsType<OkObjectResult>(result);

        var rows = await _db.PurchaseSquares.OrderBy(ps => ps.SquareId).ToListAsync();
        Assert.Equal(eerste.Id, rows[0].StadsbouerId);
        Assert.Equal(tweede.Id, rows[1].StadsbouerId);
    }

    [Fact]
    public async Task CreatePurchase_RejectsABuilderWhoIsAlreadySponsored()
    {
        SeedSquares(20, 21);
        var bouer = Seed("Reeds Geborg");
        SeedSponsorship(20, bouer.Id, PaymentStatus.Confirmed);

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 21 },
            StadsbouerIds = new List<int> { bouer.Id }
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("reeds geborg", Message(bad), StringComparison.OrdinalIgnoreCase);
        // The block must stay free: nothing was reserved for a purchase that was refused.
        Assert.Null((await _db.Squares.SingleAsync(s => s.Id == 21)).OwnerId);
    }

    [Fact]
    public async Task CreatePurchase_RejectsABuilderHeldByAnUnpaidCheckout()
    {
        SeedSquares(30, 31);
        var bouer = Seed("Hangend");
        SeedSponsorship(30, bouer.Id, PaymentStatus.Pending);

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 31 },
            StadsbouerIds = new List<int> { bouer.Id }
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreatePurchase_AllowsABuilderWhoseReservationWasCancelled()
    {
        SeedSquares(40, 41);
        var bouer = Seed("Weer Vry");
        SeedSponsorship(40, bouer.Id, PaymentStatus.Cancelled);

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 41 },
            StadsbouerIds = new List<int> { bouer.Id }
        });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task CreatePurchase_RejectsAMismatchedCount()
    {
        SeedSquares(50, 51);
        var bouer = Seed("Enkel");

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 50, 51 },
            StadsbouerIds = new List<int> { bouer.Id }
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreatePurchase_RejectsTheSameBuilderTwiceInOneOrder()
    {
        SeedSquares(60, 61);
        var bouer = Seed("Dubbel");

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 60, 61 },
            StadsbouerIds = new List<int> { bouer.Id, bouer.Id }
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreatePurchase_RejectsAnInactiveBuilder()
    {
        SeedSquares(70);
        var bouer = Seed("Weggesteek", isActive: false);

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 70 },
            StadsbouerIds = new List<int> { bouer.Id }
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreatePurchase_RefusesEverySponsorshipWhenTheOptionIsSwitchedOff()
    {
        SeedSquares(90);
        var bouer = Seed("Afgeskakel");
        SwitchStadsbouersOff();

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 90 },
            StadsbouerIds = new List<int> { bouer.Id }
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("nie beskikbaar", Message(bad), StringComparison.OrdinalIgnoreCase);
        Assert.Null((await _db.Squares.SingleAsync(s => s.Id == 90)).OwnerId);
    }

    [Fact]
    public async Task CreatePurchase_StillAllowsAnOrdinaryPurchaseWhenTheOptionIsOff()
    {
        SeedSquares(91);
        SwitchStadsbouersOff();

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 91 }
        });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task CreatePurchase_LeavesAnOrdinaryPurchaseUnpaired()
    {
        SeedSquares(80);

        var result = await CreateController().CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 80 }
        });

        Assert.IsType<OkObjectResult>(result);
        Assert.Null((await _db.PurchaseSquares.SingleAsync()).StadsbouerId);
    }

#if DEBUG
    [Fact]
    public async Task Itn_AccountSponsor_GetsOneDankieAndNoGenericConfirmation()
    {
        var purchase = SeedPendingSponsorship(guest: false);

        var controller = CreatePaymentController(out var emails);
        await controller.SimulateItn(new SimulateItnDto { PurchaseId = purchase.Id });
        await controller.SimulateItn(new SimulateItnDto { PurchaseId = purchase.Id });

        var sent = await _db.PendingEmails.ToListAsync();
        var thanks = Assert.Single(sent);
        Assert.Equal("Orania-pad: Dankie!", thanks.Subject);
        Assert.Equal("koper@test.com", thanks.To);
        Assert.Contains("Kobus Nel", thanks.HtmlBody);
        Assert.Contains("Stadsboufonds-span", thanks.HtmlBody);
    }

    [Fact]
    public async Task Itn_GuestSponsor_GetsClaimEmailPlusDankie_AndRepeatSendsNothingMore()
    {
        var purchase = SeedPendingSponsorship(guest: true);

        var controller = CreatePaymentController(out _);
        await controller.SimulateItn(new SimulateItnDto { PurchaseId = purchase.Id });
        var afterFirst = await _db.PendingEmails.ToListAsync();

        Assert.Equal(2, afterFirst.Count);
        Assert.Single(afterFirst, e => e.Subject == "Orania-pad: Dankie!" && e.To == "gas@sponsor.test");
        Assert.Single(afterFirst, e => e.Subject != "Orania-pad: Dankie!" && e.To == "gas@sponsor.test");

        await controller.SimulateItn(new SimulateItnDto { PurchaseId = purchase.Id });
        Assert.Equal(2, await _db.PendingEmails.CountAsync());
    }

    private Purchase SeedPendingSponsorship(bool guest)
    {
        _db.Roles.Add(new IdentityRole { Id = "buyer-role", Name = "Buyer", NormalizedName = "BUYER" });
        var user = _db.Users.Single(u => u.Id == "koper");
        user.FirstName = "Piet";
        SeedSquares(200);
        var builder = new Stadsbouer { Name = "Kobus Nel" };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();

        var purchase = new Purchase { UserId = "koper", Amount = 500m, PaymentStatus = PaymentStatus.Pending };
        if (guest)
        {
            purchase.GuestTokenHash = "hash";
            purchase.GuestEmail = "gas@sponsor.test";
        }
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 200, StadsbouerId = builder.Id });
        _db.Purchases.Add(purchase);
        _db.SaveChanges();
        return purchase;
    }

    private PaymentController CreatePaymentController(out EmailOutboxService emails)
    {
        var env = new Mock<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
        env.Setup(e => e.EnvironmentName).Returns("Development");
        var config = new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build();
        emails = new EmailOutboxService(_db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>());
        var sponsorships = new StadsbouerSponsorshipService(
            _db, _userManager, emails, config, Mock.Of<ILogger<StadsbouerSponsorshipService>>());
        return new PaymentController(
            _db,
            Mock.Of<IPayFastService>(),
            Mock.Of<ILogger<PaymentController>>(),
            env.Object,
            new GuestPurchaseService(_db, _userManager, Mock.Of<ILogger<GuestPurchaseService>>()),
            emails,
            config,
            null,
            sponsorships);
    }
#endif

    private void SwitchStadsbouersOff()
    {
        var settings = _db.SiteSettings.SingleOrDefault();
        if (settings == null)
        {
            settings = new SiteSettings { Id = 1 };
            _db.SiteSettings.Add(settings);
        }

        settings.StadsbouersEnabled = false;
        _db.SaveChanges();
    }

    private Stadsbouer Seed(string name, bool isActive = true)
    {
        var builder = new Stadsbouer
        {
            Name = name,
            Email = $"{name.Replace(' ', '.').ToLowerInvariant()}@bou.test",
            IsActive = isActive
        };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        return builder;
    }

    private void SeedSponsorship(int squareId, int stadsbouerId, PaymentStatus status)
    {
        var purchase = new Purchase { UserId = "koper", Amount = 500m, PaymentStatus = status };
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = squareId, StadsbouerId = stadsbouerId });
        _db.Purchases.Add(purchase);
        _db.SaveChanges();
    }

    private void SeedSquares(params int[] ids)
    {
        foreach (var id in ids)
        {
            if (!_db.Squares.Any(s => s.Id == id))
                _db.Squares.Add(new Square { Id = id, Status = SquareStatus.NogNieBeginNie });
        }
        _db.SaveChanges();
    }

    private PurchaseController CreateController()
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "koper") }, "TestAuth"))
        };
        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("203.0.113.7");

        var guests = new GuestPurchaseService(_db, _userManager, Mock.Of<ILogger<GuestPurchaseService>>());
        return new PurchaseController(_db, Mock.Of<IPayFastService>(), guests, new SiteSettingsService(_db))
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };
    }

    private static string Message(BadRequestObjectResult result) =>
        (string)result.Value!.GetType().GetProperty("message")!.GetValue(result.Value)!;

    private static UserManager<User> CreateUserManager(AppDbContext db) =>
        new(
            new UserStore<User>(db),
            Options.Create(new IdentityOptions()),
            new PasswordHasher<User>(),
            new List<IUserValidator<User>> { new UserValidator<User>() },
            new List<IPasswordValidator<User>> { new PasswordValidator<User>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null!,
            Mock.Of<ILogger<UserManager<User>>>());
}
