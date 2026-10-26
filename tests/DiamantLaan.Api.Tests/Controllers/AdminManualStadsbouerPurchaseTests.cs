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
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

/// <summary>
/// A telefoniese aankoop for a road builder: the block must end up with the builder exactly as it
/// would after a PayFast ITN, and the payer gets the "Dankie!" email instead of a welcome.
/// </summary>
public class AdminManualStadsbouerPurchaseTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;

    public AdminManualStadsbouerPurchaseTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        _db.Database.Migrate();
        _db.Roles.Add(new IdentityRole { Id = "buyer-role", Name = "Buyer", NormalizedName = "BUYER" });
        _db.SaveChanges();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task BuilderWithEmail_GetsTheBlock_AndSponsorOnlyGetsThanks()
    {
        SeedSquares(7);
        var builder = SeedBuilder("Kobus Nel", "kobus@bou.test");

        var result = await CreateController().ManualPurchase(Dto(7, builder.Id), proofOfPayment: null);

        Assert.IsType<OkObjectResult>(result);
        var purchase = await _db.Purchases.Include(p => p.PurchaseSquares).SingleAsync();
        Assert.Equal(PaymentStatus.Confirmed, purchase.PaymentStatus);
        Assert.Equal(builder.Id, purchase.PurchaseSquares.Single().StadsbouerId);

        var account = await _db.Users.SingleAsync(u => u.Email == "kobus@bou.test");
        var square = await _db.Squares.AsNoTracking().SingleAsync(s => s.Id == 7);
        Assert.Equal(account.Id, square.OwnerId);
        Assert.Equal("Kobus Nel", square.CertificateName);

        Assert.Single(_db.PendingEmails.Where(e => e.To == "kobus@bou.test"));
        var toSponsor = Assert.Single(_db.PendingEmails.Where(e => e.To == "borg@test.com"));
        Assert.Equal("Orania-pad: Dankie!", toSponsor.Subject);
    }

    [Fact]
    public async Task BuilderWithoutEmail_BlockIsHeld()
    {
        SeedSquares(7);
        var builder = SeedBuilder("Kobus Nel", null);

        Assert.IsType<OkObjectResult>(await CreateController().ManualPurchase(Dto(7, builder.Id), proofOfPayment: null));

        var holder = await _db.Users.SingleAsync(u => u.Email == StadsbouerSponsorshipService.HoldingEmail);
        Assert.Equal(holder.Id, (await _db.Squares.AsNoTracking().SingleAsync(s => s.Id == 7)).OwnerId);
    }

    [Fact]
    public async Task InactiveBuilder_IsAllowed()
    {
        SeedSquares(7);
        var builder = SeedBuilder("Kobus Nel", "kobus@bou.test", isActive: false);

        Assert.IsType<OkObjectResult>(await CreateController().ManualPurchase(Dto(7, builder.Id), proofOfPayment: null));
    }

    [Theory]
    [InlineData(PaymentStatus.Confirmed)]
    [InlineData(PaymentStatus.Pending)]
    public async Task TakenBuilder_IsRefused(PaymentStatus status)
    {
        SeedSquares(5, 7);
        var builder = SeedBuilder("Kobus Nel", "kobus@bou.test");
        _db.Users.Add(new User { Id = "ander", UserName = "ander@test.com", Email = "ander@test.com" });
        var earlier = new Purchase { UserId = "ander", Amount = 500m, PaymentStatus = status };
        earlier.PurchaseSquares.Add(new PurchaseSquare { SquareId = 5, StadsbouerId = builder.Id });
        _db.Purchases.Add(earlier);
        _db.SaveChanges();

        var result = await CreateController().ManualPurchase(Dto(7, builder.Id), proofOfPayment: null);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Null((await _db.Squares.AsNoTracking().SingleAsync(s => s.Id == 7)).OwnerId);
    }

    [Fact]
    public async Task CountMismatch_IsRefused()
    {
        SeedSquares(6, 7);
        var builder = SeedBuilder("Kobus Nel", "kobus@bou.test");
        var dto = Dto(7, builder.Id);
        dto.SquareIds = new List<int> { 6, 7 };

        Assert.IsType<BadRequestObjectResult>(await CreateController().ManualPurchase(dto, proofOfPayment: null));
        Assert.Empty(_db.Purchases);
    }

    // ---- Helpers ----

    private static ManualPurchaseDto Dto(int squareId, int stadsbouerId) => new()
    {
        Email = "borg@test.com",
        FirstName = "Piet",
        LastName = "Pompies",
        SquareIds = new List<int> { squareId },
        StadsbouerIds = new List<int> { stadsbouerId },
        PaymentMethod = "EFT"
    };

    private void SeedSquares(params int[] ids)
    {
        foreach (var id in ids)
            _db.Squares.Add(new Square { Id = id, Status = SquareStatus.NogNieBeginNie });
        _db.SaveChanges();
    }

    private Stadsbouer SeedBuilder(string name, string? email, bool isActive = true)
    {
        var builder = new Stadsbouer { Name = name, Email = email, IsActive = isActive };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        return builder;
    }

    private AdminController CreateController()
    {
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(Path.GetTempPath());
        env.Setup(e => e.WebRootPath).Returns(Path.GetTempPath());

        var config = new ConfigurationBuilder().Build();
        var blockNotifications = new BlockNotificationService(
            _db, Mock.Of<IEmailService>(), config, Mock.Of<ILogger<BlockNotificationService>>());
        var userManager = new UserManager<User>(
            new UserStore<User>(_db),
            Options.Create(new IdentityOptions()),
            new PasswordHasher<User>(),
            new List<IUserValidator<User>> { new UserValidator<User>() },
            new List<IPasswordValidator<User>> { new PasswordValidator<User>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null!,
            Mock.Of<ILogger<UserManager<User>>>());
        var outbox = new EmailOutboxService(_db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>());
        var sponsorships = new StadsbouerSponsorshipService(
            _db, userManager, outbox, config, Mock.Of<ILogger<StadsbouerSponsorshipService>>());

        return new AdminController(
            _db,
            userManager,
            env.Object,
            new AuditLogService(_db),
            new SiteSettingsService(_db),
            blockNotifications,
            new AdminSaveUndoService(_db, blockNotifications, env.Object, Mock.Of<ILogger<AdminSaveUndoService>>()),
            outbox,
            config,
            null,
            sponsorships)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "admin-1") }, "TestAuth"))
                }
            }
        };
    }
}
