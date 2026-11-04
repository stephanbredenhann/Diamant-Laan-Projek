using System.Security.Claims;
using System.Text.Json;
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
/// "Groot skenking": a donation big enough for hundreds of blocks. Real (in-memory) SQLite because
/// the commit runs in a transaction and Identity has to actually persist the donor.
/// </summary>
public class AdminLargeDonationTests : IDisposable
{
    private const string DonorEmail = "skenker@test.com";

    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly string _contentRoot;

    public AdminLargeDonationTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        _db.Database.Migrate();
        _db.Roles.Add(new IdentityRole { Id = "buyer-role", Name = "Buyer", NormalizedName = "BUYER" });
        _db.SaveChanges();

        _userManager = new UserManager<User>(
            new UserStore<User>(_db),
            Options.Create(new IdentityOptions()),
            new PasswordHasher<User>(),
            new List<IUserValidator<User>> { new UserValidator<User>() },
            new List<IPasswordValidator<User>> { new PasswordValidator<User>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null!,
            Mock.Of<ILogger<UserManager<User>>>());

        _contentRoot = Path.Combine(Path.GetTempPath(), "diamant-donation-tests-" + Guid.NewGuid().ToString("N"));
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

    // ---- Preview ----

    [Fact]
    public async Task Preview_Next_PicksLowestFreeBlocks_SkippingOwnedAndReserved()
    {
        SeedSquares(1, 10);
        SellTo(SeedOtherUser(), 1, 3);
        Reserve(2, 5);

        var json = Ok(await CreateController().Preview(new LargeDonationPreviewDto
        {
            Amount = 2_000,
            Mode = "next"
        }));

        Assert.Equal(new[] { 4, 6, 7, 8 }, Ids(json));
        Assert.Equal("4, 6-8", json.GetProperty("ranges").GetString());
        Assert.Equal(4, json.GetProperty("squareCount").GetInt32());
        Assert.Equal(2_000m, json.GetProperty("amount").GetDecimal());
        // 10 blocks, 2 sold, 2 held back.
        Assert.Equal(6, json.GetProperty("availableCount").GetInt32());
        Assert.Equal(2, json.GetProperty("reservedCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("existingDonor").ValueKind);

        // Nothing written: the only purchase is the other buyer's.
        Assert.Single(_db.Purchases);
    }

    [Fact]
    public async Task Preview_Next_IncludeReserved_UsesHeldBackBlocks()
    {
        SeedSquares(1, 10);
        SellTo(SeedOtherUser(), 1);
        Reserve(2, 3);

        var json = Ok(await CreateController().Preview(new LargeDonationPreviewDto
        {
            Amount = 1_500,
            Mode = "next",
            IncludeReserved = true
        }));

        Assert.Equal(new[] { 2, 3, 4 }, Ids(json));
        Assert.Equal(9, json.GetProperty("availableCount").GetInt32());
    }

    [Fact]
    public async Task Preview_Next_NotEnoughBlocks_IsRefused()
    {
        SeedSquares(1, 5);
        Reserve(5);

        var result = await CreateController().Preview(new LargeDonationPreviewDto { Amount = 2_500, Mode = "next" });

        var json = BadRequest(result);
        Assert.Equal(4, json.GetProperty("availableCount").GetInt32());
        Assert.Contains("net 4 blokke", json.GetProperty("message").GetString());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-500)]
    [InlineData(750)]
    [InlineData(500.50)]
    public async Task Preview_AmountNotAPositiveMultipleOf500_IsRefused(double amount)
    {
        SeedSquares(1, 5);

        var result = await CreateController().Preview(new LargeDonationPreviewDto { Amount = (decimal)amount, Mode = "next" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Preview_MoreThanTheRoad_IsRefused()
    {
        SeedSquares(1, 5);

        var result = await CreateController().Preview(new LargeDonationPreviewDto
        {
            Amount = (Square.MaxSaleableId + 1) * 500m,
            Mode = "next"
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Preview_Ranges_AllowsReserved_AndReportsExistingDonor()
    {
        SeedSquares(1, 10);
        Reserve(5);
        await _userManager.CreateAsync(new User { UserName = DonorEmail, Email = DonorEmail, FirstName = "Ou", LastName = "Skenker" });

        var json = Ok(await CreateController().Preview(new LargeDonationPreviewDto
        {
            Email = DonorEmail,
            Amount = 1_500,
            Mode = "ranges",
            SquareIds = new List<int> { 6, 4, 5 }
        }));

        Assert.Equal(new[] { 4, 5, 6 }, Ids(json));
        Assert.Equal("4-6", json.GetProperty("ranges").GetString());
        Assert.True(json.GetProperty("existingDonor").GetBoolean());
    }

    [Fact]
    public async Task Preview_Ranges_WithASoldBlock_NamesIt()
    {
        SeedSquares(1, 10);
        SellTo(SeedOtherUser(), 5);

        var json = BadRequest(await CreateController().Preview(new LargeDonationPreviewDto
        {
            Amount = 1_500,
            Mode = "ranges",
            SquareIds = new List<int> { 4, 5, 6 }
        }));

        Assert.Equal(new[] { 5 }, json.GetProperty("unavailableIds").EnumerateArray().Select(e => e.GetInt32()));
    }

    [Fact]
    public async Task Preview_Ranges_CountMustMatchAmount()
    {
        SeedSquares(1, 10);

        var result = await CreateController().Preview(new LargeDonationPreviewDto
        {
            Amount = 1_000,
            Mode = "ranges",
            SquareIds = new List<int> { 4, 5, 6 }
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Preview_Ranges_OutOfRange_IsRefused()
    {
        SeedSquares(1, 10);

        var result = await CreateController().Preview(new LargeDonationPreviewDto
        {
            Amount = 500,
            Mode = "ranges",
            SquareIds = new List<int> { Square.MaxSaleableId + 1 }
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // ---- Commit ----

    [Fact]
    public async Task Commit_R700000_SellsTheLowest1400BlocksAsOnePurchase_AndQueuesOneEmail()
    {
        SeedSquares(1, 2_000);
        var other = SeedOtherUser();
        SellTo(other, 1, 2, 3);
        Reserve(10, 11);

        var preview = Ok(await CreateController().Preview(new LargeDonationPreviewDto
        {
            Email = DonorEmail,
            Amount = 700_000,
            Mode = "next"
        }));
        var ids = Ids(preview);
        Assert.Equal(1_400, ids.Length);
        Assert.Equal(4, ids[0]);
        Assert.DoesNotContain(10, ids);
        Assert.False(preview.GetProperty("existingDonor").GetBoolean());

        var json = Ok(await CreateController().Commit(Dto(700_000, ids), proofOfPayment: null));

        Assert.Equal(1_400, json.GetProperty("squareCount").GetInt32());
        Assert.Equal(700_000m, json.GetProperty("amount").GetDecimal());
        Assert.True(json.GetProperty("newDonor").GetBoolean());
        Assert.True(json.GetProperty("emailQueued").GetBoolean());
        Assert.False(json.GetProperty("replayed").GetBoolean());
        Assert.Equal("4-9, 12-1405", json.GetProperty("ranges").GetString());

        var purchase = await _db.Purchases.Include(p => p.PurchaseSquares).SingleAsync(p => p.UserId != other.Id);
        Assert.Equal(json.GetProperty("purchaseId").GetInt32(), purchase.Id);
        Assert.Equal(PaymentStatus.Confirmed, purchase.PaymentStatus);
        Assert.Equal(700_000m, purchase.Amount);
        Assert.Equal("EFT", purchase.PaymentMethod);
        Assert.NotNull(purchase.ConfirmedAt);
        Assert.Equal(1_400, purchase.PurchaseSquares.Count);

        var donor = await _db.Users.SingleAsync(u => u.Email == DonorEmail);
        Assert.Equal(purchase.UserId, donor.Id);
        Assert.Equal("Familie Skenker", donor.CertificateName);
        Assert.False(donor.CertificateIndividual);
        Assert.True(donor.MustChangePassword);
        Assert.Equal(1_400, await _db.Squares.CountAsync(s => s.OwnerId == donor.Id));

        var email = Assert.Single(_db.PendingEmails);
        Assert.Equal(DonorEmail, email.To);
        Assert.Single(_db.AdminAuditLogs.Where(l => l.Action == "LargeDonation"));
    }

    [Fact]
    public async Task Commit_ExistingDonor_GetsTheConfirmationEmail_NotAWelcome()
    {
        SeedSquares(1, 5);
        await _userManager.CreateAsync(new User { UserName = DonorEmail, Email = DonorEmail, FirstName = "Ou", LastName = "Skenker" });

        var json = Ok(await CreateController().Commit(Dto(1_000, new[] { 1, 2 }), proofOfPayment: null));

        Assert.False(json.GetProperty("newDonor").GetBoolean());
        Assert.Single(_db.Users.Where(u => u.Email == DonorEmail));
        var email = Assert.Single(_db.PendingEmails);
        Assert.DoesNotContain("tydelike wagwoord", email.HtmlBody);
    }

    [Fact]
    public async Task Commit_BlockSoldAfterPreview_IsRefused_AndNothingIsWritten()
    {
        SeedSquares(1, 10);
        var preview = Ok(await CreateController().Preview(new LargeDonationPreviewDto { Amount = 2_000, Mode = "next" }));
        var ids = Ids(preview);

        // Someone buys block 3 on the public site while the admin is reading the summary.
        var other = SeedOtherUser();
        SellTo(other, 3);
        var purchasesBefore = await _db.Purchases.CountAsync();

        var result = await CreateController().Commit(Dto(2_000, ids), proofOfPayment: null);

        var json = BadRequest(result);
        Assert.Equal(new[] { 3 }, json.GetProperty("unavailableIds").EnumerateArray().Select(e => e.GetInt32()));

        _db.ChangeTracker.Clear();
        Assert.Equal(purchasesBefore, await _db.Purchases.CountAsync());
        Assert.False(await _db.Users.AnyAsync(u => u.Email == DonorEmail));
        Assert.Equal(other.Id, (await _db.Squares.SingleAsync(s => s.Id == 3)).OwnerId);
        Assert.True(await _db.Squares.Where(s => s.Id != 3).AllAsync(s => s.OwnerId == null));
        Assert.Empty(_db.PendingEmails);
    }

    [Fact]
    public async Task Commit_SameKeyTwice_ReturnsTheFirstPurchase_WithoutASecondOneOrEmail()
    {
        SeedSquares(1, 10);
        var key = Guid.NewGuid();

        var first = Ok(await CreateController().Commit(Dto(1_500, new[] { 1, 2, 3 }, key), proofOfPayment: null));
        var second = Ok(await CreateController().Commit(Dto(1_500, new[] { 1, 2, 3 }, key), proofOfPayment: null));

        Assert.Equal(first.GetProperty("purchaseId").GetInt32(), second.GetProperty("purchaseId").GetInt32());
        Assert.True(second.GetProperty("replayed").GetBoolean());
        Assert.Equal("1-3", second.GetProperty("ranges").GetString());
        Assert.Single(_db.Purchases);
        Assert.Single(_db.PendingEmails);
    }

    [Fact]
    public async Task Commit_SameKeyForDifferentBlocks_IsAConflict()
    {
        SeedSquares(1, 10);
        var key = Guid.NewGuid();

        Ok(await CreateController().Commit(Dto(1_000, new[] { 1, 2 }, key), proofOfPayment: null));
        var result = await CreateController().Commit(Dto(1_000, new[] { 5, 6 }, key), proofOfPayment: null);

        Assert.IsType<ConflictObjectResult>(result);
        Assert.Single(_db.Purchases);
    }

    [Fact]
    public async Task Commit_AmountNotAMultipleOf500_IsRefused()
    {
        SeedSquares(1, 10);

        var result = await CreateController().Commit(Dto(1_250, new[] { 1, 2 }), proofOfPayment: null);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(_db.Purchases);
    }

    [Fact]
    public async Task Commit_AmountMustMatchTheBlocks()
    {
        SeedSquares(1, 10);

        var result = await CreateController().Commit(Dto(1_500, new[] { 1, 2 }), proofOfPayment: null);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(_db.Purchases);
    }

    [Fact]
    public async Task Commit_WithoutAKey_IsRefused()
    {
        SeedSquares(1, 10);
        var dto = Dto(1_000, new[] { 1, 2 });
        dto.IdempotencyKey = null;

        Assert.IsType<BadRequestObjectResult>(await CreateController().Commit(dto, proofOfPayment: null));
    }

    [Fact]
    public void FormatRanges_CompactsRuns()
    {
        Assert.Equal("1-3, 7, 9-10", AdminDonationController.FormatRanges(new[] { 9, 1, 2, 3, 7, 10, 2 }));
        Assert.Equal("", AdminDonationController.FormatRanges(Array.Empty<int>()));
    }

    // ---- Helpers ----

    private static LargeDonationDto Dto(decimal amount, IEnumerable<int> ids, Guid? key = null) => new()
    {
        Email = DonorEmail,
        FirstName = "Jan",
        LastName = "Skenker",
        PaymentMethod = "EFT",
        CertificateName = "Familie Skenker",
        Amount = amount,
        SquareIds = string.Join(",", ids),
        IdempotencyKey = key ?? Guid.NewGuid()
    };

    private void SeedSquares(int from, int to)
    {
        for (var id = from; id <= to; id++)
            _db.Squares.Add(new Square { Id = id, Status = SquareStatus.NogNieBeginNie });
        _db.SaveChanges();
    }

    private User SeedOtherUser()
    {
        var user = new User
        {
            Id = "ander",
            UserName = "ander@test.com",
            NormalizedUserName = "ANDER@TEST.COM",
            Email = "ander@test.com",
            NormalizedEmail = "ANDER@TEST.COM",
            FirstName = "Ander",
            LastName = "Koper"
        };
        _db.Users.Add(user);
        _db.Purchases.Add(new Purchase { UserId = user.Id, Amount = 500, PaymentStatus = PaymentStatus.Confirmed });
        _db.SaveChanges();
        return user;
    }

    private void SellTo(User user, params int[] ids)
    {
        foreach (var square in _db.Squares.Where(s => ids.Contains(s.Id)))
            square.OwnerId = user.Id;
        _db.SaveChanges();
    }

    private void Reserve(params int[] ids)
    {
        foreach (var square in _db.Squares.Where(s => ids.Contains(s.Id)))
            square.IsReserved = true;
        _db.SaveChanges();
    }

    private static JsonElement Ok(IActionResult result) =>
        JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(result).Value);

    private static JsonElement BadRequest(IActionResult result) =>
        JsonSerializer.SerializeToElement(Assert.IsType<BadRequestObjectResult>(result).Value);

    private static int[] Ids(JsonElement json) =>
        json.GetProperty("squareIds").EnumerateArray().Select(e => e.GetInt32()).ToArray();

    private AdminDonationController CreateController()
    {
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(_contentRoot);
        env.Setup(e => e.WebRootPath).Returns(Path.Combine(_contentRoot, "wwwroot"));

        var config = new ConfigurationBuilder().Build();
        var outbox = new EmailOutboxService(_db, Mock.Of<IEmailService>(), Mock.Of<ILogger<EmailOutboxService>>());

        return new AdminDonationController(
            _db,
            _userManager,
            new AuditLogService(_db),
            new ManualSaleService(_db, _userManager, env.Object, outbox, config))
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
}
