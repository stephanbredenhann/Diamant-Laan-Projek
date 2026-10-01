using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

/// <summary>
/// Blocks bought for a road builder. Real (in-memory) SQLite, because the handover depends on
/// Identity actually creating an account and on the block's owner column moving with it.
/// </summary>
public class StadsbouerSponsorshipServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly Mock<IEmailService> _email = new();

    public StadsbouerSponsorshipServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _db = new AppDbContext(options);
        _db.Database.Migrate();
        _db.Roles.Add(new IdentityRole { Id = "buyer-role", Name = "Buyer", NormalizedName = "BUYER" });
        _db.SaveChanges();

        _userManager = CreateUserManager(_db);
        _email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task AssignAsync_CreatesAccountAndMovesBlockToBuilder()
    {
        var builder = Seed("Jan van der Merwe", "jan@bou.test");
        var purchase = SeedPurchase(squareId: 12, stadsbouerId: builder.Id);

        await CreateService().AssignAsync(purchase);

        var account = await _userManager.FindByEmailAsync("jan@bou.test");
        Assert.NotNull(account);
        Assert.True(account!.MustChangePassword);
        Assert.True(account.EmailConfirmed);
        Assert.Equal("Jan van der", account.FirstName);
        Assert.Equal("Merwe", account.LastName);
        Assert.Contains("Buyer", await _userManager.GetRolesAsync(account));

        var square = await _db.Squares.SingleAsync(s => s.Id == 12);
        Assert.Equal(account.Id, square.OwnerId);
        Assert.Equal("Jan van der Merwe", square.CertificateName);

        Assert.Single(_db.PendingEmails.Where(e => e.To == "jan@bou.test"));
    }

    [Fact]
    public async Task AssignAsync_BuilderWithoutEmail_HoldsBlockUntilEmailArrives()
    {
        var builder = Seed("Kobus Nel", null);
        var purchase = SeedPurchase(squareId: 40, stadsbouerId: builder.Id);
        var service = CreateService();

        await service.AssignAsync(purchase);

        var holder = await _userManager.FindByEmailAsync("stadsbouer-bewaring@diamantlaan.invalid");
        Assert.NotNull(holder);
        Assert.False(holder!.ReceiveBlockProgressEmails);
        var square = await _db.Squares.SingleAsync(s => s.Id == 40);
        Assert.Equal(holder.Id, square.OwnerId);
        Assert.Equal("Kobus Nel", square.CertificateName);
        Assert.Empty(_db.PendingEmails);
        Assert.Empty(_db.Squares.Where(s => s.OwnerId == "koper"));

        builder.Email = "kobus@bou.test";
        await _db.SaveChangesAsync();
        await service.ReleaseHeldAsync(builder.Id);

        var account = await _userManager.FindByEmailAsync("kobus@bou.test");
        Assert.NotNull(account);
        Assert.Equal(account!.Id, (await _db.Squares.SingleAsync(s => s.Id == 40)).OwnerId);
        Assert.Single(_db.PendingEmails.Where(e => e.To == "kobus@bou.test"));

        await service.ReleaseHeldAsync(builder.Id);
        Assert.Single(_db.PendingEmails);
    }

    [Fact]
    public async Task AssignAsync_IsIdempotent()
    {
        var builder = Seed("Pieter Botha", "pieter@bou.test");
        var purchase = SeedPurchase(squareId: 7, stadsbouerId: builder.Id);
        var service = CreateService();

        await service.AssignAsync(purchase);
        await service.AssignAsync(purchase);

        Assert.Single(_db.Users.Where(u => u.Email == "pieter@bou.test"));
        Assert.Single(_db.PendingEmails.Where(e => e.To == "pieter@bou.test"));
    }

    [Fact]
    public async Task AssignAsync_ReusesAnExistingAccountWithoutASecondPassword()
    {
        var existing = new User
        {
            UserName = "sarel@bou.test",
            Email = "sarel@bou.test",
            FirstName = "Sarel",
            LastName = "Cilliers",
            EmailConfirmed = true
        };
        Assert.True((await _userManager.CreateAsync(existing, "Bestaande1")).Succeeded);

        var builder = Seed("Sarel Cilliers", "sarel@bou.test");
        var purchase = SeedPurchase(squareId: 21, stadsbouerId: builder.Id);

        await CreateService().AssignAsync(purchase);

        Assert.Single(_db.Users.Where(u => u.Email == "sarel@bou.test"));
        var square = await _db.Squares.SingleAsync(s => s.Id == 21);
        Assert.Equal(existing.Id, square.OwnerId);
        Assert.False(existing.MustChangePassword);
    }

    [Fact]
    public async Task AssignAsync_IgnoresAnOrdinaryPurchase()
    {
        var purchase = SeedPurchase(squareId: 33, stadsbouerId: null);

        await CreateService().AssignAsync(purchase);

        var square = await _db.Squares.SingleAsync(s => s.Id == 33);
        Assert.Equal("koper", square.OwnerId);
        Assert.Empty(_db.PendingEmails);
    }

    [Fact]
    public async Task GetAvailabilityAsync_SeparatesPaidFromPending()
    {
        var betaal = Seed("Betaal Bouer", "betaal@bou.test");
        var hangend = Seed("Hangende Bouer", "hangend@bou.test");
        var gekanselleer = Seed("Vry Bouer", "vry@bou.test");

        SeedPurchase(1, betaal.Id, PaymentStatus.Confirmed);
        SeedPurchase(2, hangend.Id, PaymentStatus.Pending);
        SeedPurchase(3, gekanselleer.Id, PaymentStatus.Cancelled);

        var taken = await StadsbouerSponsorshipService.GetAvailabilityAsync(_db);

        Assert.Contains(betaal.Id, taken.Sponsored);
        Assert.Contains(hangend.Id, taken.Pending);
        Assert.True(taken.IsTaken(betaal.Id));
        Assert.True(taken.IsTaken(hangend.Id));
        // A cancelled reservation frees the builder again, with no cleanup of its own.
        Assert.False(taken.IsTaken(gekanselleer.Id));
    }

    private StadsbouerSponsorshipService CreateService() =>
        new(
            _db,
            _userManager,
            new EmailOutboxService(_db, _email.Object, Mock.Of<ILogger<EmailOutboxService>>()),
            new ConfigurationBuilder().Build(),
            Mock.Of<ILogger<StadsbouerSponsorshipService>>());

    private Stadsbouer Seed(string name, string? email)
    {
        var builder = new Stadsbouer { Name = name, Email = email };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        return builder;
    }

    private Purchase SeedPurchase(int squareId, int? stadsbouerId, PaymentStatus status = PaymentStatus.Confirmed)
    {
        if (!_db.Users.Any(u => u.Id == "koper"))
        {
            _db.Users.Add(new User { Id = "koper", UserName = "koper@test.com", Email = "koper@test.com" });
        }

        if (!_db.Squares.Any(s => s.Id == squareId))
        {
            _db.Squares.Add(new Square { Id = squareId, Status = SquareStatus.NogNieBeginNie });
        }
        _db.SaveChanges();

        var square = _db.Squares.Single(s => s.Id == squareId);
        square.OwnerId = "koper";

        var purchase = new Purchase
        {
            UserId = "koper",
            Amount = 500m,
            PaymentStatus = status,
            ConfirmedAt = status == PaymentStatus.Confirmed ? DateTime.UtcNow : null
        };
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = squareId, StadsbouerId = stadsbouerId });

        _db.Purchases.Add(purchase);
        _db.SaveChanges();
        return purchase;
    }

    private static UserManager<User> CreateUserManager(AppDbContext db)
    {
        var store = new UserStore<User>(db);
        var options = Options.Create(new IdentityOptions());
        options.Value.Password.RequireNonAlphanumeric = false;

        return new UserManager<User>(
            store,
            options,
            new PasswordHasher<User>(),
            new List<IUserValidator<User>> { new UserValidator<User>() },
            new List<IPasswordValidator<User>> { new PasswordValidator<User>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null!,
            Mock.Of<ILogger<UserManager<User>>>());
    }
}
