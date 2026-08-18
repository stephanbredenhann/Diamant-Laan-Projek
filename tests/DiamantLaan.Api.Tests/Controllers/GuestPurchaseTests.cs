using System.Security.Claims;
using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

/// <summary>
/// Covers checkout without an account. These run against a real (in-memory) SQLite database
/// because the flow depends on transactions and on Identity actually persisting users.
/// </summary>
public class GuestPurchaseTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly GuestPurchaseService _guests;

    public GuestPurchaseTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new AppDbContext(options);
        // Migrate rather than EnsureCreated so the test schema matches production exactly
        // (row-version columns included).
        _db.Database.Migrate();
        _db.Roles.Add(new IdentityRole { Id = "buyer-role", Name = "Buyer", NormalizedName = "BUYER" });
        _db.SaveChanges();

        _userManager = CreateUserManager(_db);
        _guests = new GuestPurchaseService(_db, _userManager, Mock.Of<ILogger<GuestPurchaseService>>());
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task CreateGuestPurchase_ReservesSquaresAndIssuesToken()
    {
        SeedSquares(1, 2, 3);
        var controller = CreateController();

        var result = await controller.CreateGuestPurchase(new GuestPurchaseRequestDto
        {
            SquareIds = new List<int> { 1, 2 },
            Email = "gas@test.com"
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        var purchaseId = GetValue<int>(ok.Value!, "purchaseId");
        var token = GetValue<string>(ok.Value!, "token");

        Assert.NotEqual(0, purchaseId);
        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.Equal(1000m, GetValue<decimal>(ok.Value!, "amount"));

        var purchase = await _db.Purchases.Include(p => p.PurchaseSquares).SingleAsync();
        Assert.Equal(PaymentStatus.Pending, purchase.PaymentStatus);
        Assert.Equal("gas@test.com", purchase.GuestEmail);
        // The plain token is never stored.
        Assert.NotEqual(token, purchase.GuestTokenHash);
        Assert.Equal(GuestPurchaseService.Hash(token), purchase.GuestTokenHash);

        var owner = await _db.Users.SingleAsync();
        Assert.True(owner.IsGuest);
        Assert.Null(owner.Email);

        var reserved = await _db.Squares.Where(s => s.OwnerId == owner.Id).Select(s => s.Id).ToListAsync();
        Assert.Equal(new[] { 1, 2 }, reserved);
        Assert.Null(await _db.Squares.Where(s => s.Id == 3).Select(s => s.OwnerId).SingleAsync());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("nie-n-epos")]
    public async Task CreateGuestPurchase_RequiresAValidEmail(string? email)
    {
        SeedSquares(1);
        var controller = CreateController();

        var result = await controller.CreateGuestPurchase(new GuestPurchaseRequestDto
        {
            SquareIds = new List<int> { 1 },
            Email = email!
        });

        Assert.IsType<BadRequestObjectResult>(result);
        // Nothing may be reserved or created when the email is missing.
        Assert.Null(await _db.Squares.Where(s => s.Id == 1).Select(s => s.OwnerId).SingleAsync());
        Assert.False(await _db.Users.AnyAsync(u => u.IsGuest));
        Assert.False(await _db.Purchases.AnyAsync());
    }

    [Fact]
    public async Task CreateGuestPurchase_WithSoldSquare_LeavesNoShadowUserBehind()
    {
        SeedSquares(1);
        var existing = new User { Id = "owner", UserName = "owner@test.com", Email = "owner@test.com" };
        _db.Users.Add(existing);
        (await _db.Squares.SingleAsync()).OwnerId = existing.Id;
        await _db.SaveChangesAsync();

        var controller = CreateController();

        var result = await controller.CreateGuestPurchase(new GuestPurchaseRequestDto
        {
            SquareIds = new List<int> { 1 },
            Email = "gas@test.com"
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.False(await _db.Users.AnyAsync(u => u.IsGuest));
    }

    [Fact]
    public async Task CreateGuestPurchase_StopsAfterThreePendingFromSameIp()
    {
        SeedSquares(1, 2, 3, 4);
        var controller = CreateController();

        for (var squareId = 1; squareId <= GuestPurchaseService.MaxPendingPerIp; squareId++)
        {
            var ok = await controller.CreateGuestPurchase(new GuestPurchaseRequestDto
            {
                SquareIds = new List<int> { squareId },
                Email = "gas@test.com"
            });
            Assert.IsType<OkObjectResult>(ok);
        }

        var blocked = await controller.CreateGuestPurchase(new GuestPurchaseRequestDto
        {
            SquareIds = new List<int> { 4 },
            Email = "gas@test.com"
        });

        Assert.IsType<BadRequestObjectResult>(blocked);
        Assert.Null(await _db.Squares.Where(s => s.Id == 4).Select(s => s.OwnerId).SingleAsync());
    }

    [Fact]
    public async Task GetGuestPurchase_WithWrongToken_ReturnsNotFound()
    {
        var (purchaseId, _) = await CreateGuestPurchaseAsync(1, 2);
        var controller = CreateController();

        var wrongToken = await controller.GetGuestPurchase(purchaseId, "not-the-token");
        var noToken = await controller.GetGuestPurchase(purchaseId, null);

        // 404 rather than 403, because a 403 would confirm that the purchase id exists.
        Assert.IsType<NotFoundResult>(wrongToken);
        Assert.IsType<NotFoundResult>(noToken);
    }

    [Fact]
    public async Task GetGuestPurchase_WithCorrectToken_ReturnsSquares()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1, 2);
        var controller = CreateController();

        var result = await controller.GetGuestPurchase(purchaseId, token);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal("Pending", GetValue<string>(ok.Value!, "paymentStatus"));
        Assert.Equal(new[] { 1, 2 }, GetValue<IEnumerable<int>>(ok.Value!, "squares").ToArray());
    }

    [Fact]
    public async Task SetGuestCertificateName_RequiresConfirmedPayment()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1);
        var controller = CreateController();

        var tooEarly = await controller.SetGuestCertificateName(
            purchaseId, new GuestCertificateNameDto { Token = token, Name = "Jan Boer" });
        Assert.IsType<BadRequestObjectResult>(tooEarly);

        await ConfirmAsync(purchaseId);

        var result = await controller.SetGuestCertificateName(
            purchaseId, new GuestCertificateNameDto { Token = token, Name = "Jan Boer" });

        Assert.IsType<OkObjectResult>(result);
        var owner = await _db.Users.SingleAsync(u => u.IsGuest);
        Assert.Equal("Jan", owner.FirstName);
        Assert.Equal("Boer", owner.LastName);
    }

    /// <summary>
    /// A guest who bought more than one block gets the same choice a signed-in buyer gets on the
    /// certificate page: one name for everything, or a name per block.
    /// </summary>
    [Fact]
    public async Task SetGuestCertificateName_PerBlock_NamesEachSquareAndSwitchesBackCleanly()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1, 2);
        await ConfirmAsync(purchaseId);
        var controller = CreateController();

        var perBlock = await controller.SetGuestCertificateName(purchaseId, new GuestCertificateNameDto
        {
            Token = token,
            Name = "Jan Boer",
            SameForAll = false,
            Blocks = new()
            {
                new BlockCertificateNameDto { SquareId = 1, Name = "Jan Boer" },
                new BlockCertificateNameDto { SquareId = 2, Name = "Anna Boer" }
            }
        });

        Assert.IsType<OkObjectResult>(perBlock);
        Assert.Equal("Jan Boer", (await _db.Squares.SingleAsync(s => s.Id == 1)).CertificateName);
        Assert.Equal("Anna Boer", (await _db.Squares.SingleAsync(s => s.Id == 2)).CertificateName);
        Assert.True((await _db.Users.SingleAsync(u => u.IsGuest)).CertificateIndividual);

        // Every block needs a name of its own; a short one is not a certificate anybody wants.
        var incomplete = await controller.SetGuestCertificateName(purchaseId, new GuestCertificateNameDto
        {
            Token = token,
            Name = "Jan Boer",
            SameForAll = false,
            Blocks = new() { new BlockCertificateNameDto { SquareId = 1, Name = "Jan Boer" } }
        });
        Assert.IsType<BadRequestObjectResult>(incomplete);

        // Going back to one name has to clear the per-block names, or the sheets keep printing them.
        var shared = await controller.SetGuestCertificateName(
            purchaseId, new GuestCertificateNameDto { Token = token, Name = "Jan Boer" });

        Assert.IsType<OkObjectResult>(shared);
        Assert.All(await _db.Squares.ToListAsync(), s => Assert.Null(s.CertificateName));
        Assert.False((await _db.Users.SingleAsync(u => u.IsGuest)).CertificateIndividual);
    }

    /// <summary>
    /// The same 15-minute window a signed-in buyer gets. A guest can still claim the purchase days
    /// later off the emailed link, so without this the certificate would stay renameable forever.
    /// </summary>
    [Fact]
    public async Task SetGuestCertificateName_LocksFifteenMinutesAfterConfirmation()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1);
        await ConfirmAsync(purchaseId);
        var controller = CreateController();

        var named = await controller.SetGuestCertificateName(
            purchaseId, new GuestCertificateNameDto { Token = token, Name = "Jan Boer" });
        Assert.IsType<OkObjectResult>(named);

        var purchase = await _db.Purchases.SingleAsync(p => p.Id == purchaseId);
        purchase.ConfirmedAt = DateTime.UtcNow - TimeSpan.FromMinutes(16);
        await _db.SaveChangesAsync();

        var tooLate = await controller.SetGuestCertificateName(
            purchaseId, new GuestCertificateNameDto { Token = token, Name = "Iemand Anders" });

        Assert.Equal(StatusCodes.Status403Forbidden, Assert.IsType<ObjectResult>(tooLate).StatusCode);
        var owner = await _db.Users.SingleAsync(u => u.IsGuest);
        Assert.Equal("Jan", owner.FirstName);

        var stillLocked = Assert.IsType<OkObjectResult>(await controller.GetGuestPurchase(purchaseId, token));
        Assert.False(GetValue<bool>(stillLocked.Value!, "canEdit"));
    }

    /// <summary>
    /// An abandoned checkout coming back through the emailed link has never been named, so it may
    /// still be named however long it has been. The alternative is printing a blank certificate.
    /// </summary>
    [Fact]
    public async Task SetGuestCertificateName_StaysOpenForAPurchaseThatWasNeverNamed()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1);
        await ConfirmAsync(purchaseId);

        var purchase = await _db.Purchases.SingleAsync(p => p.Id == purchaseId);
        purchase.ConfirmedAt = DateTime.UtcNow - TimeSpan.FromDays(3);
        await _db.SaveChangesAsync();

        var controller = CreateController();
        var result = await controller.SetGuestCertificateName(
            purchaseId, new GuestCertificateNameDto { Token = token, Name = "Jan Boer" });

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("Jan", (await _db.Users.SingleAsync(u => u.IsGuest)).FirstName);
    }

    [Fact]
    public async Task UpgradeShadowUser_KeepsPurchaseAndSquaresInPlace()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1, 2);
        await ConfirmAsync(purchaseId);

        var purchase = await _guests.FindByTokenAsync(purchaseId, token);
        Assert.NotNull(purchase);
        var originalUserId = purchase!.UserId;

        var result = await _guests.UpgradeShadowUserAsync(purchase, new GuestPurchaseService.RegistrationDetails(
            "nuut@test.com", "Wagwoord1!", "Jan", "Boer", "+27821234567", "+27", false, false));

        Assert.True(result.Succeeded);

        var user = await _db.Users.SingleAsync();
        Assert.Equal(originalUserId, user.Id);
        Assert.False(user.IsGuest);
        Assert.Equal("nuut@test.com", user.Email);
        Assert.NotNull(user.PasswordHash);

        var reloaded = await _db.Purchases.SingleAsync();
        Assert.Equal(originalUserId, reloaded.UserId);
        // The token is spent once the purchase belongs to a real account.
        Assert.Null(reloaded.GuestTokenHash);
        Assert.Equal(2, await _db.Squares.CountAsync(s => s.OwnerId == originalUserId));
    }

    /// <summary>
    /// The reported bug: a password Identity rejects used to be checked only after the email
    /// had been committed, so the shadow user was left half upgraded. The retry then found that
    /// email and answered 409, and the account it pointed at had no password to log in with.
    /// </summary>
    [Fact]
    public async Task UpgradeShadowUser_RejectedPassword_LeavesShadowUserUntouched()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1, 2);
        await ConfirmAsync(purchaseId);

        var purchase = await _guests.FindByTokenAsync(purchaseId, token);
        var originalUserId = purchase!.UserId;

        // Rejected by Identity: no digit, no uppercase.
        var result = await _guests.UpgradeShadowUserAsync(purchase, new GuestPurchaseService.RegistrationDetails(
            "nuut@test.com", "wagwoord", "Jan", "Boer", "+27821234567", "+27", false, false));

        Assert.False(result.Succeeded);

        var user = await _db.Users.SingleAsync();
        Assert.Equal(originalUserId, user.Id);
        Assert.True(user.IsGuest);
        Assert.Null(user.Email);
        Assert.Null(user.PasswordHash);
    }

    [Fact]
    public async Task UpgradeShadowUser_SucceedsOnRetryAfterRejectedPassword()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1, 2);
        await ConfirmAsync(purchaseId);

        var purchase = await _guests.FindByTokenAsync(purchaseId, token);
        var originalUserId = purchase!.UserId;

        await _guests.UpgradeShadowUserAsync(purchase, new GuestPurchaseService.RegistrationDetails(
            "nuut@test.com", "wagwoord", "Jan", "Boer", "+27821234567", "+27", false, false));

        var retry = await _guests.UpgradeShadowUserAsync(purchase, new GuestPurchaseService.RegistrationDetails(
            "nuut@test.com", "Wagwoord1", "Jan", "Boer", "+27821234567", "+27", false, false));

        Assert.True(retry.Succeeded);

        var user = await _db.Users.SingleAsync();
        Assert.Equal(originalUserId, user.Id);
        Assert.Equal("nuut@test.com", user.Email);
        Assert.NotNull(user.PasswordHash);
        Assert.Equal(2, await _db.Squares.CountAsync(s => s.OwnerId == originalUserId));
    }

    /// <summary>
    /// Recovery path for accounts the bug already broke: email set, IsGuest false, no password.
    /// Those buyers can neither register nor log in, so the upgrade has to resume for them.
    /// </summary>
    [Fact]
    public async Task UpgradeShadowUser_ResumesHalfUpgradedAccount()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1, 2);
        await ConfirmAsync(purchaseId);

        var purchase = await _guests.FindByTokenAsync(purchaseId, token);
        var stuck = await _db.Users.SingleAsync(u => u.Id == purchase!.UserId);
        stuck.Email = "vas@test.com";
        stuck.NormalizedEmail = "VAS@TEST.COM";
        stuck.UserName = "vas@test.com";
        stuck.NormalizedUserName = "VAS@TEST.COM";
        stuck.IsGuest = false;
        await _db.SaveChangesAsync();

        var result = await _guests.UpgradeShadowUserAsync(purchase!, new GuestPurchaseService.RegistrationDetails(
            "vas@test.com", "Wagwoord1!", "Jan", "Boer", "+27821234567", "+27", false, false));

        Assert.True(result.Succeeded);
        Assert.NotNull((await _db.Users.SingleAsync()).PasswordHash);
    }

    /// <summary>A purchase already attached to a real account must still be refused.</summary>
    [Fact]
    public async Task UpgradeShadowUser_RefusesAccountThatAlreadyHasAPassword()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1, 2);
        await ConfirmAsync(purchaseId);

        var purchase = await _guests.FindByTokenAsync(purchaseId, token);
        await _guests.UpgradeShadowUserAsync(purchase!, new GuestPurchaseService.RegistrationDetails(
            "nuut@test.com", "Wagwoord1!", "Jan", "Boer", "+27821234567", "+27", false, false));

        var again = await _guests.UpgradeShadowUserAsync(purchase!, new GuestPurchaseService.RegistrationDetails(
            "ander@test.com", "Wagwoord1!", "Piet", "Boer", "+27821234567", "+27", false, false));

        Assert.False(again.Succeeded);
        Assert.Equal("nuut@test.com", (await _db.Users.SingleAsync()).Email);
    }

    [Fact]
    public async Task MergeIntoUser_MovesSquaresAndRemovesShadowUser()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1, 2);
        await ConfirmAsync(purchaseId);

        var target = new User { Id = "real", UserName = "real@test.com", Email = "real@test.com" };
        _db.Users.Add(target);
        await _db.SaveChangesAsync();

        var purchase = await _guests.FindByTokenAsync(purchaseId, token);
        var shadowUserId = purchase!.UserId;

        var merged = await _guests.MergeIntoUserAsync(purchase, target.Id);

        Assert.True(merged);
        Assert.Equal(target.Id, (await _db.Purchases.SingleAsync()).UserId);
        Assert.Equal(2, await _db.Squares.CountAsync(s => s.OwnerId == target.Id));
        Assert.False(await _db.Users.AnyAsync(u => u.Id == shadowUserId));
    }

    [Fact]
    public async Task MergeIntoUser_IsIdempotent()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1);
        await ConfirmAsync(purchaseId);

        var target = new User { Id = "real", UserName = "real@test.com", Email = "real@test.com" };
        _db.Users.Add(target);
        await _db.SaveChangesAsync();

        var purchase = await _guests.FindByTokenAsync(purchaseId, token);
        Assert.True(await _guests.MergeIntoUserAsync(purchase!, target.Id));

        // A repeated claim must not orphan the squares.
        Assert.True(await _guests.MergeIntoUserAsync(purchase!, target.Id));
        Assert.Equal(1, await _db.Squares.CountAsync(s => s.OwnerId == target.Id));
    }

    [Fact]
    public async Task ClaimToken_FromFollowUpEmail_WorksOnTheSameEndpoints()
    {
        var (purchaseId, _) = await CreateGuestPurchaseAsync(1);
        await ConfirmAsync(purchaseId);

        var purchase = await _db.Purchases.Include(p => p.PurchaseSquares).SingleAsync();
        var claimToken = await _guests.IssueClaimTokenAsync(purchase);
        Assert.NotNull(claimToken);

        var controller = CreateController();
        var result = await controller.GetGuestPurchase(purchaseId, claimToken);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal("Confirmed", GetValue<string>(ok.Value!, "paymentStatus"));
    }

    [Fact]
    public async Task IssueClaimToken_OnlyEverIssuesOnce()
    {
        var (purchaseId, _) = await CreateGuestPurchaseAsync(1);
        await ConfirmAsync(purchaseId);

        var purchase = await _db.Purchases.SingleAsync();
        var first = await _guests.IssueClaimTokenAsync(purchase);
        var second = await _guests.IssueClaimTokenAsync(purchase);

        Assert.NotNull(first);
        // A repeated ITN must not produce a second email or invalidate the first link.
        Assert.Null(second);
        Assert.Equal(GuestPurchaseService.Hash(first!), purchase.ClaimTokenHash);
    }

    [Fact]
    public async Task ExpiredClaimToken_IsRejected()
    {
        var (purchaseId, _) = await CreateGuestPurchaseAsync(1);
        await ConfirmAsync(purchaseId);

        var purchase = await _db.Purchases.SingleAsync();
        var claimToken = await _guests.IssueClaimTokenAsync(purchase);
        purchase.ClaimTokenExpiresAt = DateTime.UtcNow.AddDays(-1);
        await _db.SaveChangesAsync();

        var controller = CreateController();
        var result = await controller.GetGuestPurchase(purchaseId, claimToken);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ClaimingThePurchase_RetiresTheEmailedLink()
    {
        var (purchaseId, token) = await CreateGuestPurchaseAsync(1);
        await ConfirmAsync(purchaseId);

        var purchase = await _db.Purchases.Include(p => p.PurchaseSquares).SingleAsync();
        var claimToken = await _guests.IssueClaimTokenAsync(purchase);

        var target = new User { Id = "real", UserName = "real@test.com", Email = "real@test.com" };
        _db.Users.Add(target);
        await _db.SaveChangesAsync();

        Assert.True(await _guests.MergeIntoUserAsync(purchase, target.Id));

        var controller = CreateController();
        Assert.IsType<NotFoundResult>(await controller.GetGuestPurchase(purchaseId, claimToken));
        Assert.IsType<NotFoundResult>(await controller.GetGuestPurchase(purchaseId, token));
    }

    private async Task<(int purchaseId, string token)> CreateGuestPurchaseAsync(params int[] squareIds)
    {
        SeedSquares(squareIds);
        var controller = CreateController();

        var result = await controller.CreateGuestPurchase(new GuestPurchaseRequestDto
        {
            SquareIds = squareIds.ToList(),
            Email = "gas@test.com"
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        return (GetValue<int>(ok.Value!, "purchaseId"), GetValue<string>(ok.Value!, "token"));
    }

    private async Task ConfirmAsync(int purchaseId)
    {
        var purchase = await _db.Purchases.SingleAsync(p => p.Id == purchaseId);
        purchase.PaymentStatus = PaymentStatus.Confirmed;
        purchase.PayFastPaymentId = "pf-test";
        purchase.ConfirmedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private void SeedSquares(params int[] ids)
    {
        foreach (var id in ids)
        {
            if (!_db.Squares.Any(s => s.Id == id))
                _db.Squares.Add(new Square { Id = id, Status = SquareStatus.NogNieBeginNie });
        }
        _db.SaveChanges();
    }

    private PurchaseController CreateController()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("203.0.113.7");

        return new PurchaseController(_db, Mock.Of<IPayFastService>(), _guests)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };
    }

    private static UserManager<User> CreateUserManager(AppDbContext db)
    {
        var store = new UserStore<User>(db);
        // Mirrors Program.cs: special characters are not required.
        var options = Options.Create(new IdentityOptions());
        options.Value.Password.RequireNonAlphanumeric = false;
        var hasher = new PasswordHasher<User>();
        var userValidators = new List<IUserValidator<User>> { new UserValidator<User>() };
        var passwordValidators = new List<IPasswordValidator<User>> { new PasswordValidator<User>() };

        return new UserManager<User>(
            store,
            options,
            hasher,
            userValidators,
            passwordValidators,
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
