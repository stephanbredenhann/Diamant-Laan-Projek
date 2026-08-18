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
/// The certificate names an admin takes down over the phone. Real (in-memory) SQLite because
/// ManualPurchase runs in a transaction and Identity has to actually persist the buyer.
/// </summary>
public class AdminManualPurchaseCertificateNamesTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly string _contentRoot;

    public AdminManualPurchaseCertificateNamesTests()
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
        _contentRoot = Path.Combine(Path.GetTempPath(), "diamant-cert-name-tests-" + Guid.NewGuid().ToString("N"));
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

    [Fact]
    public async Task ManualPurchase_IndividualNames_WritesOnePerBlock()
    {
        SeedSquares(1, 2, 3);

        var result = await CreateAdminController().ManualPurchase(new ManualPurchaseDto
        {
            Email = "telefoon@test.com",
            FirstName = "Piet",
            LastName = "Pompies",
            SquareIds = new List<int> { 1, 2, 3 },
            CertificateIndividual = true,
            CertificateName = "Piet Pompies",
            CertificateNames = new Dictionary<int, string>
            {
                [1] = "Anna Pompies",
                [2] = "  Klein Piet  ",
                // Block 3 deliberately left out: it falls back to the summary name.
            }
        }, proofOfPayment: null);

        Assert.IsType<OkObjectResult>(result);

        var user = _db.Users.Single(u => u.Email == "telefoon@test.com");
        Assert.Equal("Piet Pompies", user.CertificateName);
        Assert.True(user.CertificateIndividual);

        Assert.Equal("Anna Pompies", _db.Squares.Single(s => s.Id == 1).CertificateName);
        Assert.Equal("Klein Piet", _db.Squares.Single(s => s.Id == 2).CertificateName);
        Assert.Equal("Piet Pompies", _db.Squares.Single(s => s.Id == 3).CertificateName);
    }

    [Fact]
    public async Task ManualPurchase_SameForAll_LeavesBlocksWithoutTheirOwnName()
    {
        SeedSquares(1, 2);

        var result = await CreateAdminController().ManualPurchase(new ManualPurchaseDto
        {
            Email = "telefoon@test.com",
            FirstName = "Piet",
            LastName = "Pompies",
            SquareIds = new List<int> { 1, 2 },
            CertificateIndividual = false,
            CertificateName = "Pompies Familie",
            // Sent by a form that had the fields filled in before the admin unticked the box.
            CertificateNames = new Dictionary<int, string> { [1] = "Anna Pompies" }
        }, proofOfPayment: null);

        Assert.IsType<OkObjectResult>(result);

        var user = _db.Users.Single(u => u.Email == "telefoon@test.com");
        Assert.Equal("Pompies Familie", user.CertificateName);
        Assert.False(user.CertificateIndividual);
        Assert.All(_db.Squares.ToList(), s => Assert.Null(s.CertificateName));
    }

    [Fact]
    public async Task ManualPurchase_BlankCertificateName_FallsBackToBuyersOwnName()
    {
        SeedSquares(1);

        var result = await CreateAdminController().ManualPurchase(new ManualPurchaseDto
        {
            Email = "telefoon@test.com",
            FirstName = "Piet",
            LastName = "Pompies",
            SquareIds = new List<int> { 1 },
            CertificateIndividual = true,
            CertificateName = "   "
        }, proofOfPayment: null);

        Assert.IsType<OkObjectResult>(result);

        var user = _db.Users.Single(u => u.Email == "telefoon@test.com");
        Assert.Equal("Piet Pompies", user.CertificateName);
        Assert.Equal("Piet Pompies", _db.Squares.Single(s => s.Id == 1).CertificateName);
    }

    [Fact]
    public async Task ManualPurchase_ReturningBuyer_LeavesEarlierBlocksAlone()
    {
        SeedSquares(1, 2);

        var admin = CreateAdminController();
        await admin.ManualPurchase(new ManualPurchaseDto
        {
            Email = "telefoon@test.com",
            FirstName = "Piet",
            LastName = "Pompies",
            SquareIds = new List<int> { 1 },
            CertificateIndividual = true,
            CertificateName = "Piet Pompies",
            CertificateNames = new Dictionary<int, string> { [1] = "Anna Pompies" }
        }, proofOfPayment: null);

        var result = await CreateAdminController().ManualPurchase(new ManualPurchaseDto
        {
            Email = "telefoon@test.com",
            FirstName = "Piet",
            LastName = "Pompies",
            SquareIds = new List<int> { 2 },
            CertificateIndividual = true,
            CertificateName = "Piet Pompies",
            CertificateNames = new Dictionary<int, string> { [2] = "Klein Piet" }
        }, proofOfPayment: null);

        Assert.IsType<OkObjectResult>(result);

        // The second order must not reissue the first block's certificate under a new name.
        Assert.Equal("Anna Pompies", _db.Squares.Single(s => s.Id == 1).CertificateName);
        Assert.Equal("Klein Piet", _db.Squares.Single(s => s.Id == 2).CertificateName);
    }

    // ---- Helpers ----

    private void SeedSquares(params int[] ids)
    {
        foreach (var id in ids)
            _db.Squares.Add(new Square { Id = id, Status = SquareStatus.NogNieBeginNie });
        _db.SaveChanges();
    }

    private AdminController CreateAdminController()
    {
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(_contentRoot);
        env.Setup(e => e.WebRootPath).Returns(Path.Combine(_contentRoot, "wwwroot"));

        var config = new ConfigurationBuilder().Build();
        var blockNotifications = new BlockNotificationService(
            _db, Mock.Of<IEmailService>(), config, Mock.Of<ILogger<BlockNotificationService>>());

        return new AdminController(
            _db,
            _userManager,
            env.Object,
            new AuditLogService(_db),
            new SiteSettingsService(_db),
            blockNotifications,
            new AdminSaveUndoService(_db, blockNotifications, env.Object, Mock.Of<ILogger<AdminSaveUndoService>>()),
            new EmailOutboxService(_db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>()),
            config)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[] { new Claim(ClaimTypes.NameIdentifier, "admin-1") }, "TestAuth"))
                }
            }
        };
    }

    private static UserManager<User> CreateUserManager(AppDbContext db)
    {
        var store = new UserStore<User>(db);
        var options = new IdentityOptions();
        var passwordHasher = new PasswordHasher<User>();
        var validators = new List<IUserValidator<User>> { new UserValidator<User>() };
        var passwordValidators = new List<IPasswordValidator<User>> { new PasswordValidator<User>() };

        return new UserManager<User>(
            store,
            new OptionsWrapper<IdentityOptions>(options),
            passwordHasher,
            validators,
            passwordValidators,
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null!,
            Mock.Of<ILogger<UserManager<User>>>());
    }
}
