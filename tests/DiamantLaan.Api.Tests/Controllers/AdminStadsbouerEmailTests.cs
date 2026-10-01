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

/// <summary>A stadsbouer's email is optional: blank is stored as null, a malformed one is still rejected.</summary>
public class AdminStadsbouerEmailTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;

    public AdminStadsbouerEmailTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        _db.Database.Migrate();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task Create_BlankEmail_StoresNull()
    {
        var result = await CreateController(false, out _).CreateStadsbouer(new StadsbouerUploadDto { Name = "Kobus Nel", Email = "  " }, null);

        Assert.IsType<OkObjectResult>(result);
        Assert.Null((await _db.Stadsbouers.SingleAsync()).Email);
    }

    [Fact]
    public async Task Create_BadEmail_ReturnsBadRequest()
    {
        var result = await CreateController(false, out _).CreateStadsbouer(new StadsbouerUploadDto { Name = "Kobus Nel", Email = "nie-'n-epos" }, null);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(_db.Stadsbouers);
    }

    [Fact]
    public async Task Update_AddingEmail_MovesHeldBlockToBuilderAndQueuesOneEmail()
    {
        _db.Roles.Add(new IdentityRole { Id = "buyer-role", Name = "Buyer", NormalizedName = "BUYER" });
        _db.Users.Add(new User { Id = "koper", UserName = "koper@test.com", Email = "koper@test.com" });
        _db.Squares.Add(new Square { Id = 5, OwnerId = "koper" });
        var builder = new Stadsbouer { Name = "Kobus Nel" };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        var purchase = new Purchase { UserId = "koper", Amount = 500m, PaymentStatus = PaymentStatus.Confirmed, ConfirmedAt = DateTime.UtcNow };
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 5, StadsbouerId = builder.Id });
        _db.Purchases.Add(purchase);
        _db.SaveChanges();

        var controller = CreateController(withSponsorships: true, out var sponsorships);
        await sponsorships!.AssignAsync(purchase);
        var holder = await _db.Users.SingleAsync(u => u.Email == StadsbouerSponsorshipService.HoldingEmail);
        Assert.Equal(holder.Id, (await _db.Squares.SingleAsync(s => s.Id == 5)).OwnerId);
        Assert.Empty(_db.PendingEmails);

        var result = await controller.UpdateStadsbouer(builder.Id, new StadsbouerUploadDto { Name = "Kobus Nel", Email = "kobus@bou.test" }, null);

        Assert.IsType<OkObjectResult>(result);
        var account = await _db.Users.SingleAsync(u => u.Email == "kobus@bou.test");
        Assert.Equal(account.Id, (await _db.Squares.SingleAsync(s => s.Id == 5)).OwnerId);
        Assert.Single(_db.PendingEmails.Where(e => e.To == "kobus@bou.test"));
    }

    [Fact]
    public async Task Update_CorrectedEmail_MovesBlockOffTheMistypedAccount()
    {
        _db.Roles.Add(new IdentityRole { Id = "buyer-role", Name = "Buyer", NormalizedName = "BUYER" });
        _db.Users.Add(new User { Id = "koper", UserName = "koper@test.com", Email = "koper@test.com" });
        _db.Squares.Add(new Square { Id = 5, OwnerId = "koper" });
        var builder = new Stadsbouer { Name = "Kobus Nel", Email = "kobus@tikfout.test" };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        var purchase = new Purchase { UserId = "koper", Amount = 500m, PaymentStatus = PaymentStatus.Confirmed, ConfirmedAt = DateTime.UtcNow };
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 5, StadsbouerId = builder.Id });
        _db.Purchases.Add(purchase);
        _db.SaveChanges();

        var controller = CreateController(withSponsorships: true, out var sponsorships);
        await sponsorships!.AssignAsync(purchase);
        var wrong = await _db.Users.SingleAsync(u => u.Email == "kobus@tikfout.test");
        Assert.Equal(wrong.Id, (await _db.Squares.SingleAsync(s => s.Id == 5)).OwnerId);

        var result = await controller.UpdateStadsbouer(builder.Id, new StadsbouerUploadDto { Name = "Kobus Nel", Email = "kobus@bou.test" }, null);

        Assert.IsType<OkObjectResult>(result);
        var right = await _db.Users.SingleAsync(u => u.Email == "kobus@bou.test");
        Assert.Equal(right.Id, (await _db.Squares.SingleAsync(s => s.Id == 5)).OwnerId);
        Assert.Single(_db.PendingEmails.Where(e => e.To == "kobus@bou.test"));
    }

    [Fact]
    public async Task AdminPhoto_ServesAnInactiveBuildersPhoto()
    {
        var builder = new Stadsbouer { Name = "Kobus Nel", IsActive = false };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        var dir = FileUploadService.GetStadsbouerUploadsPath(CreateEnv());
        var file = Path.Combine(dir, $"{builder.Id}.jpg");
        await File.WriteAllBytesAsync(file, new byte[] { 0xFF, 0xD8, 0xFF });
        builder.PhotoPath = $"stadsbouers/{builder.Id}.jpg";
        _db.SaveChanges();

        try
        {
            var result = await CreateController(false, out _).GetStadsbouerPhoto(builder.Id, CancellationToken.None);
            Assert.Equal("image/jpeg", Assert.IsType<PhysicalFileResult>(result).ContentType);
        }
        finally
        {
            File.Delete(file);
        }
    }

    [Fact]
    public async Task SponsoredCertificates_ListsBuilderBlocksTheBuyerNoLongerOwns()
    {
        _db.Users.Add(new User { Id = "koper", UserName = "koper@test.com", Email = "koper@test.com" });
        _db.Users.Add(new User { Id = "bou", UserName = "bou@test.com", Email = "bou@test.com" });
        _db.Squares.Add(new Square { Id = 5, OwnerId = "bou", CertificateName = "Oom Kobus" });
        _db.Squares.Add(new Square { Id = 6, OwnerId = "bou" });
        _db.Squares.Add(new Square { Id = 7, OwnerId = "koper" });
        var builder = new Stadsbouer { Name = "Kobus Nel" };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        var purchase = new Purchase { UserId = "koper", Amount = 500m, PaymentStatus = PaymentStatus.Confirmed, ConfirmedAt = DateTime.UtcNow };
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 6, StadsbouerId = builder.Id });
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 5, StadsbouerId = builder.Id });
        purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = 7 });
        _db.Purchases.Add(purchase);
        _db.SaveChanges();

        var result = await CreateController(false, out _).GetSponsoredCertificates("koper");

        var json = System.Text.Json.JsonSerializer.Serialize(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Contains("\"OwnerName\":\"Kobus Nel\"", json);
        Assert.Contains("\"Id\":5,", json);
        Assert.Contains("\"OwnerName\":\"Oom Kobus\"", json);
        Assert.True(json.IndexOf("\"Id\":5,") < json.IndexOf("\"Id\":6,"));
        Assert.DoesNotContain("\"Id\":7,", json);
        Assert.Equal("[]", System.Text.Json.JsonSerializer.Serialize(((OkObjectResult)await CreateController(false, out _).GetSponsoredCertificates("niemand")).Value));
    }

    [Fact]
    public async Task CertificateSummary_ReturnsBuilderNameAndBlocks_And404WhenUnsponsored()
    {
        _db.Users.Add(new User { Id = "koper", UserName = "koper@test.com", Email = "koper@test.com" });
        _db.Squares.Add(new Square { Id = 5 });
        _db.Squares.Add(new Square { Id = 6, CertificateName = "Oom Kobus" });
        var builder = new Stadsbouer { Name = "Kobus Nel" };
        var other = new Stadsbouer { Name = "Niemand" };
        _db.Stadsbouers.AddRange(builder, other);
        _db.SaveChanges();
        SeedSponsorship(builder.Id, 6, 5);

        var controller = CreateController(false, out _);
        var ok = Assert.IsType<OkObjectResult>(await controller.GetStadsbouerCertificateSummary(builder.Id));
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"OwnerName\":\"Kobus Nel\"", json);
        Assert.Contains("\"SameForAll\":true", json);
        Assert.Contains("\"Id\":5,", json);
        Assert.Contains("\"OwnerName\":\"Oom Kobus\"", json);

        Assert.IsType<NotFoundResult>(await controller.GetStadsbouerCertificateSummary(other.Id));
    }

    [Fact]
    public async Task Oorhandig_StoresPhotoAndQueuesEmail_AndRedoOverwritesInPlaceWithoutEmailing()
    {
        _db.Users.Add(new User { Id = "koper", UserName = "koper@test.com", Email = "koper@test.com", FirstName = "Piet" });
        _db.Squares.Add(new Square { Id = 5 });
        var builder = new Stadsbouer { Name = "Kobus Nel" };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        SeedSponsorship(builder.Id, 5);

        var controller = CreateController(true, out _);
        var first = Assert.IsType<OkObjectResult>(await controller.HandOverStadsbouer(builder.Id, ImageFile(), CancellationToken.None));
        var url1 = (string)first.Value!.GetType().GetProperty("handoverPhotoUrl")!.GetValue(first.Value)!;
        var fileName1 = url1.Substring("/api/stadsbouers/oorhandig/".Length);
        var path1 = Path.Combine(FileUploadService.GetStadsbouerUploadsPath(CreateEnv()), fileName1);

        try
        {
            var saved = await _db.Stadsbouers.SingleAsync();
            Assert.NotNull(saved.HandedOverAt);
            Assert.Equal("stadsbouers/" + fileName1, saved.HandoverPhotoPath);
            Assert.True(File.Exists(path1));
            var email = Assert.Single(_db.PendingEmails);
            Assert.Equal("Orania-pad: Borg oorhandig!", email.Subject);
            Assert.Equal("koper@test.com", email.To);
            Assert.Contains(AppPublicUrl.LiveSite + url1, email.HtmlBody);

            var handedOverAt = saved.HandedOverAt;
            var second = Assert.IsType<OkObjectResult>(await controller.HandOverStadsbouer(builder.Id, ImageFile(), CancellationToken.None));
            var url2 = (string)second.Value!.GetType().GetProperty("handoverPhotoUrl")!.GetValue(second.Value)!;
            Assert.Equal(url1, url2);
            Assert.True(File.Exists(path1));
            Assert.Single(_db.PendingEmails);
            Assert.Equal(handedOverAt, (await _db.Stadsbouers.SingleAsync()).HandedOverAt);

            var publicController = new StadsbouersController(_db, new SiteSettingsService(_db), CreateEnv());
            Assert.IsType<PhysicalFileResult>(await publicController.GetHandoverPhoto(fileName1, CancellationToken.None));
        }
        finally
        {
            var dir = FileUploadService.GetStadsbouerUploadsPath(CreateEnv());
            foreach (var f in Directory.GetFiles(dir, "oorhandig-*"))
                File.Delete(f);
        }
    }

    [Fact]
    public async Task Rename_CarriesOverToSponsoredBlocks_ButKeepsANameChosenSince()
    {
        _db.Users.Add(new User { Id = "koper", UserName = "koper@test.com", Email = "koper@test.com" });
        _db.Squares.Add(new Square { Id = 5, CertificateName = "Kobus Nell" });
        _db.Squares.Add(new Square { Id = 6, CertificateName = "Oom Kobus" });
        _db.Squares.Add(new Square { Id = 7, CertificateName = "Kobus Nell" });
        var builder = new Stadsbouer { Name = "Kobus Nell" };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        SeedSponsorship(builder.Id, 5, 6);

        await CreateController(false, out _).UpdateStadsbouer(builder.Id, new StadsbouerUploadDto { Name = "Kobus Nel" }, null);

        Assert.Equal("Kobus Nel", (await _db.Squares.SingleAsync(s => s.Id == 5)).CertificateName);
        Assert.Equal("Oom Kobus", (await _db.Squares.SingleAsync(s => s.Id == 6)).CertificateName);
        Assert.Equal("Kobus Nell", (await _db.Squares.SingleAsync(s => s.Id == 7)).CertificateName);
    }

    [Fact]
    public async Task Oorhandig_RejectsNonImageAndUnsponsoredBuilder()
    {
        _db.Users.Add(new User { Id = "koper", UserName = "koper@test.com", Email = "koper@test.com" });
        _db.Squares.Add(new Square { Id = 5 });
        var sponsored = new Stadsbouer { Name = "Geborg" };
        var free = new Stadsbouer { Name = "Vry" };
        _db.Stadsbouers.AddRange(sponsored, free);
        _db.SaveChanges();
        SeedSponsorship(sponsored.Id, 5);

        var controller = CreateController(true, out _);
        Assert.IsType<BadRequestObjectResult>(await controller.HandOverStadsbouer(sponsored.Id, ImageFile("text/plain", new byte[] { 1, 2, 3, 4 }), CancellationToken.None));
        Assert.IsType<BadRequestObjectResult>(await controller.HandOverStadsbouer(free.Id, ImageFile(), CancellationToken.None));
        Assert.IsType<NotFoundResult>(await controller.HandOverStadsbouer(999, ImageFile(), CancellationToken.None));
        Assert.Null((await _db.Stadsbouers.SingleAsync(s => s.Id == sponsored.Id)).HandedOverAt);
    }

    [Fact]
    public async Task PublicHandoverPhoto_RejectsBadAndUnknownFileNames()
    {
        var controller = new StadsbouersController(_db, new SiteSettingsService(_db), CreateEnv());

        Assert.IsType<NotFoundResult>(await controller.GetHandoverPhoto("..%2f..%2fsecret.jpg", CancellationToken.None));
        Assert.IsType<NotFoundResult>(await controller.GetHandoverPhoto("1.jpg", CancellationToken.None));
        Assert.IsType<NotFoundResult>(await controller.GetHandoverPhoto($"oorhandig-{new string('a', 32)}.jpg", CancellationToken.None));
    }

    private void SeedSponsorship(int stadsbouerId, params int[] squareIds)
    {
        var purchase = new Purchase { UserId = "koper", Amount = 500m, PaymentStatus = PaymentStatus.Confirmed, ConfirmedAt = DateTime.UtcNow };
        foreach (var id in squareIds)
            purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = id, StadsbouerId = stadsbouerId });
        _db.Purchases.Add(purchase);
        _db.SaveChanges();
    }

    private static IFormFile ImageFile(string contentType = "image/jpeg", byte[]? bytes = null)
    {
        bytes ??= new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0 };
        var file = new Mock<IFormFile>();
        file.Setup(f => f.ContentType).Returns(contentType);
        file.Setup(f => f.Length).Returns(bytes.Length);
        file.Setup(f => f.OpenReadStream()).Returns(() => new MemoryStream(bytes));
        file.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Returns((Stream target, CancellationToken ct) => new MemoryStream(bytes).CopyToAsync(target, ct));
        return file.Object;
    }

    private AdminController CreateController(bool withSponsorships, out StadsbouerSponsorshipService? sponsorships)
    {
        var env = Mock.Get(CreateEnv());

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
        sponsorships = withSponsorships
            ? new StadsbouerSponsorshipService(_db, userManager, outbox, config, Mock.Of<ILogger<StadsbouerSponsorshipService>>())
            : null;

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

    private static IWebHostEnvironment CreateEnv()
    {
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(Path.GetTempPath());
        env.Setup(e => e.WebRootPath).Returns(Path.GetTempPath());
        return env.Object;
    }
}
