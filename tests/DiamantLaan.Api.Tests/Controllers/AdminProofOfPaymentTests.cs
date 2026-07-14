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

public class AdminProofOfPaymentTests : IDisposable
{
    private readonly string _contentRoot;

    public AdminProofOfPaymentTests()
    {
        _contentRoot = Path.Combine(Path.GetTempPath(), "diamant-proof-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_contentRoot);
    }

    public void Dispose()
    {
        if (Directory.Exists(_contentRoot))
            Directory.Delete(_contentRoot, recursive: true);
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private AdminController CreateController(AppDbContext db)
    {
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(_contentRoot);
        env.Setup(e => e.WebRootPath).Returns(Path.Combine(_contentRoot, "wwwroot"));

        var config = new ConfigurationBuilder().Build();
        var blockNotifications = new BlockNotificationService(
            db,
            Mock.Of<IEmailService>(),
            config,
            Mock.Of<ILogger<BlockNotificationService>>());
        var saveUndo = new AdminSaveUndoService(
            db,
            blockNotifications,
            env.Object,
            Mock.Of<ILogger<AdminSaveUndoService>>());

        var controller = new AdminController(
            db,
            CreateUserManagerMock().Object,
            env.Object,
            new AuditLogService(db),
            new SiteSettingsService(db),
            blockNotifications,
            saveUndo,
            new EmailOutboxService(db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>()),
            config);

        var identity = new System.Security.Claims.ClaimsIdentity(new[]
        {
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "admin-1"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, "admin@test.com")
        }, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new System.Security.Claims.ClaimsPrincipal(identity)
            }
        };

        return controller;
    }

    private static Mock<UserManager<User>> CreateUserManagerMock()
    {
        var store = new Mock<IUserStore<User>>();
        return new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
    }

    private static IFormFile CreatePdfFormFile(string content = "%PDF-1.4 test")
    {
        var bytes = System.Text.Encoding.ASCII.GetBytes(content);
        var file = new Mock<IFormFile>();
        file.Setup(f => f.ContentType).Returns("application/pdf");
        file.Setup(f => f.Length).Returns(bytes.Length);
        file.Setup(f => f.FileName).Returns("bewys.pdf");
        file.Setup(f => f.OpenReadStream()).Returns(() => new MemoryStream(bytes));
        file.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Returns<Stream, CancellationToken>((s, ct) => new MemoryStream(bytes).CopyToAsync(s, ct));
        return file.Object;
    }

    private static IFormFile CreateNonPdfFormFile()
    {
        var bytes = System.Text.Encoding.ASCII.GetBytes("not-a-pdf");
        var file = new Mock<IFormFile>();
        file.Setup(f => f.ContentType).Returns("text/plain");
        file.Setup(f => f.Length).Returns(bytes.Length);
        file.Setup(f => f.FileName).Returns("bewys.txt");
        file.Setup(f => f.OpenReadStream()).Returns(() => new MemoryStream(bytes));
        return file.Object;
    }

    private static async Task<Purchase> SeedTelephonePurchase(AppDbContext db, int id = 1, string? proofPath = null)
    {
        var user = new User
        {
            Id = "u1",
            UserName = "buyer@test.com",
            Email = "buyer@test.com",
            FirstName = "Jan",
            LastName = "Boer"
        };
        db.Users.Add(user);

        var purchase = new Purchase
        {
            Id = id,
            UserId = user.Id,
            User = user,
            Amount = 500m,
            PaymentStatus = PaymentStatus.Confirmed,
            PurchaseDate = DateTime.UtcNow,
            ProofOfPaymentPath = proofPath
        };
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 101 });
        db.Purchases.Add(purchase);
        await db.SaveChangesAsync();
        return purchase;
    }

    [Fact]
    public async Task GetTransactions_IncludesHasProof()
    {
        await using var db = CreateDb();
        await SeedTelephonePurchase(db, proofPath: "proofs/1.pdf");

        var controller = CreateController(db);
        var result = await controller.GetTransactions();

        var ok = Assert.IsType<OkObjectResult>(result);
        var rows = Assert.IsAssignableFrom<IEnumerable<PurchaseTransactionDto>>(ok.Value);
        var row = Assert.Single(rows);
        Assert.True(row.HasProof);
        Assert.Equal("TelefonieseAankoop", row.PurchaseSource);
    }

    [Fact]
    public async Task UploadProof_CreatesFileAndSetsPath()
    {
        await using var db = CreateDb();
        await SeedTelephonePurchase(db);

        var controller = CreateController(db);
        var result = await controller.UploadProofOfPayment(1, CreatePdfFormFile());

        var ok = Assert.IsType<OkObjectResult>(result);
        var purchase = await db.Purchases.FindAsync(1);
        Assert.Equal("proofs/1.pdf", purchase!.ProofOfPaymentPath);
        Assert.True(File.Exists(Path.Combine(_contentRoot, "App_Data", "uploads", "proofs", "1.pdf")));
    }

    [Fact]
    public async Task UploadProof_ReplacesExistingFile()
    {
        await using var db = CreateDb();
        await SeedTelephonePurchase(db, proofPath: "proofs/1.pdf");

        var proofsDir = Path.Combine(_contentRoot, "App_Data", "uploads", "proofs");
        Directory.CreateDirectory(proofsDir);
        var path = Path.Combine(proofsDir, "1.pdf");
        await File.WriteAllTextAsync(path, "%PDF-1.4 old");

        var controller = CreateController(db);
        var result = await controller.UploadProofOfPayment(1, CreatePdfFormFile("%PDF-1.4 replaced"));

        Assert.IsType<OkObjectResult>(result);
        var content = await File.ReadAllTextAsync(path);
        Assert.Contains("replaced", content);
    }

    [Fact]
    public async Task UploadProof_RejectsNonPdf()
    {
        await using var db = CreateDb();
        await SeedTelephonePurchase(db);

        var controller = CreateController(db);
        var result = await controller.UploadProofOfPayment(1, CreateNonPdfFormFile());

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UploadProof_RejectsPayFastPurchase()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            UserName = "buyer@test.com",
            Email = "buyer@test.com",
            FirstName = "Jan",
            LastName = "Boer"
        };
        db.Users.Add(user);
        db.Purchases.Add(new Purchase
        {
            Id = 2,
            UserId = user.Id,
            Amount = 500m,
            PaymentStatus = PaymentStatus.Confirmed,
            PayFastPaymentId = "pf-123",
            PurchaseDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.UploadProofOfPayment(2, CreatePdfFormFile());

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteProof_ClearsPathAndRemovesFile()
    {
        await using var db = CreateDb();
        await SeedTelephonePurchase(db, proofPath: "proofs/1.pdf");

        var proofsDir = Path.Combine(_contentRoot, "App_Data", "uploads", "proofs");
        Directory.CreateDirectory(proofsDir);
        var path = Path.Combine(proofsDir, "1.pdf");
        await File.WriteAllTextAsync(path, "%PDF-1.4 old");

        var controller = CreateController(db);
        var result = await controller.DeleteProofOfPayment(1);

        Assert.IsType<OkObjectResult>(result);
        var purchase = await db.Purchases.FindAsync(1);
        Assert.Null(purchase!.ProofOfPaymentPath);
        Assert.False(File.Exists(path));
    }
}
