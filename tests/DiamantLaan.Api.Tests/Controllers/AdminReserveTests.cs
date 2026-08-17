using Microsoft.Extensions.Caching.Memory;
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
/// Covers the admin "Reserveer" flag: blocks held back from public sale but still
/// sellable by hand. Real (in-memory) SQLite because the purchase paths use
/// transactions and Identity has to actually persist users.
/// </summary>
public class AdminReserveTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly string _contentRoot;

    public AdminReserveTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options);
        _db.Database.Migrate();
        _db.Roles.Add(new IdentityRole { Id = "buyer-role", Name = "Buyer", NormalizedName = "BUYER" });
        _db.SaveChanges();

        _userManager = CreateUserManager(_db);
        _contentRoot = Path.Combine(Path.GetTempPath(), "diamant-reserve-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_contentRoot);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        if (Directory.Exists(_contentRoot))
            Directory.Delete(_contentRoot, recursive: true);
        GC.SuppressFinalize(this);
    }

    // ---- The admin endpoint ----

    [Fact]
    public async Task BulkReserve_SetsFlagAndWritesAuditEntry()
    {
        SeedSquares(1, 2, 3);

        var result = await CreateAdminController().BulkReserve(new BulkReserveDto
        {
            SquareIds = new List<int> { 1, 3 },
            Reserved = true
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(2, GetValue<int>(ok.Value!, "updated"));

        Assert.True(_db.Squares.Single(s => s.Id == 1).IsReserved);
        Assert.False(_db.Squares.Single(s => s.Id == 2).IsReserved);
        Assert.True(_db.Squares.Single(s => s.Id == 3).IsReserved);

        var audit = await _db.AdminAuditLogs.SingleAsync();
        Assert.Equal("ReserveSquares", audit.Action);
    }

    [Fact]
    public async Task BulkReserve_ClearsFlagWhenReservedIsFalse()
    {
        SeedSquares(1, 2);
        _db.Squares.ToList().ForEach(s => s.IsReserved = true);
        await _db.SaveChangesAsync();

        var result = await CreateAdminController().BulkReserve(new BulkReserveDto
        {
            SquareIds = new List<int> { 1, 2 },
            Reserved = false
        });

        Assert.IsType<OkObjectResult>(result);
        Assert.All(_db.Squares.ToList(), s => Assert.False(s.IsReserved));
        Assert.Equal("UnreserveSquares", (await _db.AdminAuditLogs.SingleAsync()).Action);
    }

    [Fact]
    public async Task BulkReserve_RejectsAlreadySoldSquare()
    {
        SeedSquares(1, 2);
        var buyer = await CreateUser("koper@test.com");
        _db.Squares.Single(s => s.Id == 2).OwnerId = buyer.Id;
        await _db.SaveChangesAsync();

        var result = await CreateAdminController().BulkReserve(new BulkReserveDto
        {
            SquareIds = new List<int> { 1, 2 },
            Reserved = true
        });

        Assert.IsType<BadRequestObjectResult>(result);
        // Nothing is written when one block in the batch is bad.
        Assert.False(_db.Squares.Single(s => s.Id == 1).IsReserved);
    }

    [Fact]
    public async Task BulkReserve_RejectsSquareThatDoesNotExist()
    {
        SeedSquares(1);

        var result = await CreateAdminController().BulkReserve(new BulkReserveDto
        {
            SquareIds = new List<int> { 1, 9999 },
            Reserved = true
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // ---- The public purchase paths ----

    [Fact]
    public async Task CreatePurchase_RejectsReservedSquare()
    {
        SeedSquares(1, 2);
        Reserve(2);
        var buyer = await CreateUser("koper@test.com");

        var result = await CreatePurchaseController(buyer.Id).CreatePurchase(new PurchaseRequestDto
        {
            SquareIds = new List<int> { 1, 2 }
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.All(_db.Squares.ToList(), s => Assert.Null(s.OwnerId));
    }

    [Fact]
    public async Task CreateGuestPurchase_RejectsReservedSquare()
    {
        SeedSquares(1, 2);
        Reserve(2);

        var result = await CreatePurchaseController(null).CreateGuestPurchase(new GuestPurchaseRequestDto
        {
            SquareIds = new List<int> { 1, 2 },
            Email = "gas@test.com"
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ManualPurchase_SucceedsOnReservedSquare()
    {
        SeedSquares(1, 2);
        Reserve(1, 2);

        var result = await CreateAdminController().ManualPurchase(new ManualPurchaseDto
        {
            Email = "telefoon@test.com",
            FirstName = "Piet",
            LastName = "Pompies",
            SquareIds = new List<int> { 1, 2 }
        }, proofOfPayment: null);

        Assert.IsType<OkObjectResult>(result);
        Assert.All(_db.Squares.ToList(), s => Assert.NotNull(s.OwnerId));
    }

    // ---- Auto-pick ----

    [Fact]
    public async Task PickSquares_SkipsReservedAndNoLongerSkipsLowNumbers()
    {
        SeedSquares(1, 2, 3, 4);
        Reserve(2);

        var result = await new RoadController(_db, new MemoryCache(new MemoryCacheOptions())).PickSquares(3);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(new List<int> { 1, 3, 4 }, GetValue<List<int>>(ok.Value!, "squareIds"));
    }

    // ---- Helpers ----

    private void SeedSquares(params int[] ids)
    {
        foreach (var id in ids)
            _db.Squares.Add(new Square { Id = id, Status = SquareStatus.NogNieBeginNie });
        _db.SaveChanges();
    }

    private void Reserve(params int[] ids)
    {
        foreach (var id in ids)
            _db.Squares.Single(s => s.Id == id).IsReserved = true;
        _db.SaveChanges();
    }

    private async Task<User> CreateUser(string email)
    {
        var user = new User { UserName = email, Email = email, EmailConfirmed = true };
        var created = await _userManager.CreateAsync(user);
        Assert.True(created.Succeeded);
        return user;
    }

    private AdminController CreateAdminController()
    {
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(_contentRoot);
        env.Setup(e => e.WebRootPath).Returns(Path.Combine(_contentRoot, "wwwroot"));

        var config = new ConfigurationBuilder().Build();
        var blockNotifications = new BlockNotificationService(
            _db, Mock.Of<IEmailService>(), config, Mock.Of<ILogger<BlockNotificationService>>());

        var controller = new AdminController(
            _db,
            _userManager,
            env.Object,
            new AuditLogService(_db),
            new SiteSettingsService(_db),
            blockNotifications,
            new AdminSaveUndoService(_db, blockNotifications, env.Object, Mock.Of<ILogger<AdminSaveUndoService>>()),
            new EmailOutboxService(_db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>()),
            config);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = Principal("admin-1") }
        };
        return controller;
    }

    private PurchaseController CreatePurchaseController(string? userId)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("203.0.113.7");
        if (userId != null)
            httpContext.User = Principal(userId);

        var guests = new GuestPurchaseService(_db, _userManager, Mock.Of<ILogger<GuestPurchaseService>>());
        return new PurchaseController(_db, Mock.Of<IPayFastService>(), guests)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };
    }

    private static ClaimsPrincipal Principal(string userId) =>
        new(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId) }, "TestAuth"));

    private static UserManager<User> CreateUserManager(AppDbContext db)
    {
        return new UserManager<User>(
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

    private static T GetValue<T>(object source, string propertyName)
    {
        var property = source.GetType().GetProperty(propertyName);
        Assert.NotNull(property);
        return (T)property!.GetValue(source)!;
    }
}
