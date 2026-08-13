using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

/// <summary>
/// Real SQLite: GetStats groups by date and sums amounts, both of which
/// behave differently on the in-memory provider than in production.
/// </summary>
public class AdminStatsTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;

    public AdminStatsTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options);
        _db.Database.Migrate();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task GetStats_EmptyDatabase_ReturnsZeros()
    {
        var result = await CreateController().GetStats();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(0, GetValue<int>(ok.Value!, "soldSquares"));
        Assert.Equal(0d, GetValue<double>(ok.Value!, "totalRaised"));
        Assert.Equal(0, GetValue<int>(ok.Value!, "oraniaSquares"));
        Assert.Equal(0, GetValue<int>(ok.Value!, "bewegingSquares"));
        Assert.Empty(GetValue<IEnumerable<object>>(ok.Value!, "dailySales"));
    }

    [Fact]
    public async Task GetStats_ConfirmedPurchase_CountsResidentAndBewegingSquares()
    {
        var user = AddUser("koper@test.com", resident: true, beweging: true);
        AddPurchase(user, 1000m, PaymentStatus.Confirmed, squareIds: [1, 2]);
        AddPurchase(user, 500m, PaymentStatus.Pending, squareIds: [3]);
        await _db.SaveChangesAsync();

        var result = await CreateController().GetStats();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1000d, GetValue<double>(ok.Value!, "totalRaised"));
        Assert.Equal(2, GetValue<int>(ok.Value!, "oraniaSquares"));
        Assert.Equal(0, GetValue<int>(ok.Value!, "outsiderSquares"));
        Assert.Equal(2, GetValue<int>(ok.Value!, "bewegingSquares"));
        Assert.Equal(0, GetValue<int>(ok.Value!, "nonBewegingSquares"));
        Assert.Single(GetValue<IEnumerable<object>>(ok.Value!, "dailySales"));
    }

    [Fact]
    public async Task GetStats_MissingUser_DoesNotThrow()
    {
        var user = AddUser("koper@test.com", resident: false, beweging: false);
        AddPurchase(user, 500m, PaymentStatus.Confirmed, squareIds: [1]);
        await _db.SaveChangesAsync();

        await _db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys=OFF");
        await _db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUsers WHERE Id = {0}", user.Id);
        _db.ChangeTracker.Clear();

        var result = await CreateController().GetStats();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(500d, GetValue<double>(ok.Value!, "totalRaised"));
        Assert.Equal(0, GetValue<int>(ok.Value!, "oraniaSquares"));
        Assert.Equal(0, GetValue<int>(ok.Value!, "outsiderSquares"));
    }

    private User AddUser(string email, bool resident, bool beweging)
    {
        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            UserName = email,
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            NormalizedUserName = email.ToUpperInvariant(),
            FirstName = "Piet",
            LastName = "Pompies",
            EmailConfirmed = true,
            IsOraniaResident = resident,
            IsOraniaBewegingMember = beweging
        };
        _db.Users.Add(user);
        return user;
    }

    private Purchase AddPurchase(User user, decimal amount, PaymentStatus status, int[] squareIds)
    {
        foreach (var id in squareIds)
        {
            if (_db.Squares.Local.All(s => s.Id != id) && !_db.Squares.Any(s => s.Id == id))
                _db.Squares.Add(new Square { Id = id, Status = SquareStatus.NogNieBeginNie, OwnerId = status == PaymentStatus.Confirmed ? user.Id : null });
        }

        var purchase = new Purchase
        {
            UserId = user.Id,
            User = user,
            Amount = amount,
            PaymentStatus = status,
            PurchaseDate = DateTime.UtcNow
        };
        foreach (var id in squareIds)
            purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = id });
        _db.Purchases.Add(purchase);
        return purchase;
    }

    private AdminController CreateController()
    {
        var config = new ConfigurationBuilder().Build();
        var env = Mock.Of<IWebHostEnvironment>();
        var store = new Mock<IUserStore<User>>();
        var userManager = new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        var blockNotifications = new BlockNotificationService(
            _db, Mock.Of<IEmailService>(), config, Mock.Of<ILogger<BlockNotificationService>>());

        return new AdminController(
            _db,
            userManager.Object,
            env,
            new AuditLogService(_db),
            new SiteSettingsService(_db),
            blockNotifications,
            new AdminSaveUndoService(_db, blockNotifications, env, Mock.Of<ILogger<AdminSaveUndoService>>()),
            new EmailOutboxService(_db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>()),
            config);
    }

    private static T GetValue<T>(object source, string propertyName)
    {
        var property = source.GetType().GetProperty(propertyName);
        Assert.NotNull(property);
        return (T)property!.GetValue(source)!;
    }
}
