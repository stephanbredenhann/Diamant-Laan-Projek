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
/// Covers the admin "Verwyder transaksie" endpoint. Runs against real (in-memory) SQLite because the
/// delete wraps its work in a database transaction and re-checks the admin's password through Identity.
/// </summary>
public class AdminDeleteTransactionTests : IDisposable
{
    private const string AdminPassword = "Admin!2345";

    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly User _admin;

    public AdminDeleteTransactionTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new AppDbContext(options);
        _db.Database.Migrate();

        _userManager = CreateUserManager(_db);
        _admin = new User { Id = "admin1", UserName = "admin@test.com", Email = "admin@test.com" };
        var created = _userManager.CreateAsync(_admin, AdminPassword).GetAwaiter().GetResult();
        Assert.True(created.Succeeded);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task DeleteTransaction_ConfirmedManualPurchase_RemovesItAndReleasesBlocks()
    {
        var purchase = SeedPurchase(PaymentStatus.Confirmed, 1, 2, 3);
        var controller = CreateController();

        var result = await controller.DeleteTransaction(purchase.Id, new DeleteTransactionDto { Password = AdminPassword });

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(await _db.Purchases.ToListAsync());
        Assert.Empty(await _db.PurchaseSquares.ToListAsync());

        var squares = await _db.Squares.Where(s => new[] { 1, 2, 3 }.Contains(s.Id)).ToListAsync();
        Assert.Equal(3, squares.Count);
        Assert.All(squares, s => Assert.Null(s.OwnerId));
        Assert.All(squares, s => Assert.Null(s.CertificateName));
    }

    [Fact]
    public async Task DeleteTransaction_WrongPassword_ChangesNothing()
    {
        var purchase = SeedPurchase(PaymentStatus.Confirmed, 1, 2);
        var controller = CreateController();

        var result = await controller.DeleteTransaction(purchase.Id, new DeleteTransactionDto { Password = "verkeerd!1" });

        var denied = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, denied.StatusCode);
        Assert.Single(await _db.Purchases.ToListAsync());
        Assert.All(await _db.Squares.ToListAsync(), s => Assert.Equal("buyer1", s.OwnerId));
    }

    [Fact]
    public async Task DeleteTransaction_BlockResoldToSomeoneElse_IsNotReleased()
    {
        var purchase = SeedPurchase(PaymentStatus.Confirmed, 1, 2);
        var other = new User { Id = "buyer2", UserName = "ander@test.com", Email = "ander@test.com" };
        _db.Users.Add(other);
        var resold = await _db.Squares.FirstAsync(s => s.Id == 2);
        resold.OwnerId = other.Id;
        await _db.SaveChangesAsync();

        var controller = CreateController();

        var result = await controller.DeleteTransaction(purchase.Id, new DeleteTransactionDto { Password = AdminPassword });

        Assert.IsType<NoContentResult>(result);
        Assert.Null((await _db.Squares.FirstAsync(s => s.Id == 1)).OwnerId);
        Assert.Equal("buyer2", (await _db.Squares.FirstAsync(s => s.Id == 2)).OwnerId);
    }

    [Fact]
    public async Task DeleteTransaction_UnknownId_ReturnsNotFound()
    {
        var controller = CreateController();

        var result = await controller.DeleteTransaction(999, new DeleteTransactionDto { Password = AdminPassword });

        Assert.IsType<NotFoundResult>(result);
    }

    private Purchase SeedPurchase(PaymentStatus status, params int[] squareIds)
    {
        var buyer = new User { Id = "buyer1", UserName = "koper@test.com", Email = "koper@test.com" };
        _db.Users.Add(buyer);

        var purchase = new Purchase
        {
            UserId = buyer.Id,
            Amount = squareIds.Length * 500m,
            PaymentStatus = status,
            ConfirmedAt = status == PaymentStatus.Confirmed ? DateTime.UtcNow : null,
            PaymentMethod = "EFT"
        };

        foreach (var id in squareIds)
        {
            _db.Squares.Add(new Square
            {
                Id = id,
                Status = SquareStatus.NogNieBeginNie,
                OwnerId = buyer.Id,
                CertificateName = "Ou naam"
            });
            purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = id });
        }

        _db.Purchases.Add(purchase);
        _db.SaveChanges();
        return purchase;
    }

    private AdminController CreateController()
    {
        var config = new ConfigurationBuilder().Build();
        var env = Mock.Of<IWebHostEnvironment>();
        var blockNotifications = new BlockNotificationService(
            _db,
            Mock.Of<IEmailService>(),
            config,
            Mock.Of<ILogger<BlockNotificationService>>());
        var saveUndo = new AdminSaveUndoService(
            _db,
            blockNotifications,
            env,
            Mock.Of<ILogger<AdminSaveUndoService>>());

        var controller = new AdminController(
            _db,
            _userManager,
            env,
            new AuditLogService(_db),
            new SiteSettingsService(_db),
            blockNotifications,
            saveUndo,
            new EmailOutboxService(_db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>()),
            config);

        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _admin.Id),
            new Claim(ClaimTypes.Name, _admin.UserName!)
        }, "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        return controller;
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
