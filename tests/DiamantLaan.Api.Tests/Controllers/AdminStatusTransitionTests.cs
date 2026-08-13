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
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

/// <summary>
/// Which status moves the admin bulk update allows. Backwards moves are deliberately
/// permitted so a block marked too far ahead can be corrected; forward jumps of more
/// than one phase are still blocked.
/// </summary>
public class AdminStatusTransitionTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;

    public AdminStatusTransitionTests()
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

    [Theory]
    [InlineData(SquareStatus.KlaarGeteer, SquareStatus.BesigOmTeTeer)]
    [InlineData(SquareStatus.KlaarGeteer, SquareStatus.Voorberei)]
    [InlineData(SquareStatus.KlaarGeteer, SquareStatus.NogNieBeginNie)]
    [InlineData(SquareStatus.BesigOmTeTeer, SquareStatus.NogNieBeginNie)]
    public async Task BulkUpdateStatus_AllowsMovingBackwards(SquareStatus from, SquareStatus to)
    {
        Seed(1, from);

        var result = await CreateController().BulkUpdateStatus(new BulkStatusUpdateDto
        {
            SquareIds = new List<int> { 1 },
            Status = to
        });

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(to, _db.Squares.Single(s => s.Id == 1).Status);
    }

    [Fact]
    public async Task BulkUpdateStatus_StillBlocksSkippingMoreThanOnePhaseForward()
    {
        Seed(1, SquareStatus.NogNieBeginNie);

        var result = await CreateController().BulkUpdateStatus(new BulkStatusUpdateDto
        {
            SquareIds = new List<int> { 1 },
            Status = SquareStatus.KlaarGeteer
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(SquareStatus.NogNieBeginNie, _db.Squares.Single(s => s.Id == 1).Status);
    }

    [Fact]
    public async Task BulkUpdateStatus_BackwardsMoveIsUndoable()
    {
        Seed(1, SquareStatus.KlaarGeteer);

        await CreateController().BulkUpdateStatus(new BulkStatusUpdateDto
        {
            SquareIds = new List<int> { 1 },
            Status = SquareStatus.Voorberei,
            UndoBatchId = "batch-1"
        });

        var undo = CreateUndoService();
        var (ok, err) = await undo.UndoActiveAsync();

        Assert.True(ok, err);
        Assert.Equal(SquareStatus.KlaarGeteer, _db.Squares.Single(s => s.Id == 1).Status);
    }

    private void Seed(int id, SquareStatus status)
    {
        _db.Squares.Add(new Square { Id = id, Status = status });
        _db.SaveChanges();
    }

    private AdminSaveUndoService CreateUndoService()
    {
        var config = new ConfigurationBuilder().Build();
        var env = Mock.Of<IWebHostEnvironment>();
        var blockNotifications = new BlockNotificationService(
            _db, Mock.Of<IEmailService>(), config, Mock.Of<ILogger<BlockNotificationService>>());
        return new AdminSaveUndoService(_db, blockNotifications, env, Mock.Of<ILogger<AdminSaveUndoService>>());
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

        var controller = new AdminController(
            _db,
            userManager.Object,
            env,
            new AuditLogService(_db),
            new SiteSettingsService(_db),
            blockNotifications,
            new AdminSaveUndoService(_db, blockNotifications, env, Mock.Of<ILogger<AdminSaveUndoService>>()),
            new EmailOutboxService(_db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>()),
            config);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.NameIdentifier, "admin-1") }, "TestAuth"))
            }
        };
        return controller;
    }
}
