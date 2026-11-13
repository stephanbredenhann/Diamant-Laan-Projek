using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class StraatfeesServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly Mock<IPayFastService> _payFast = new();
    private readonly Mock<IEmailService> _email = new();
    private readonly StraatfeesService _service;

    public StraatfeesServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        _db.Database.Migrate();

        _email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Straatfees:AdultPrice"] = "150" })
            .Build();

        var outbox = new EmailOutboxService(_db, _email.Object, Mock.Of<ILogger<EmailOutboxService>>());
        _service = new StraatfeesService(_db, _payFast.Object, outbox, config, Mock.Of<ILogger<StraatfeesService>>());
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task CreateOrder_PricesAdultsAndChildrenAndIssuesCode()
    {
        // Adults from config (150), children at the R10 default.
        var (order, error) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan Steyn", Email = "jan@test.com", Adults = 2, Children = 3 });

        Assert.Null(error);
        Assert.NotNull(order);
        Assert.Equal(330m, order!.Amount);
        Assert.Equal(150m, order.AdultUnitPrice);
        Assert.Equal(10m, order.ChildUnitPrice);
        Assert.Equal(5, order.Quantity);
        Assert.Equal(10, order.TicketCode.Length);
        Assert.Equal(PaymentStatus.Pending, order.PaymentStatus);
        Assert.Equal("SF-" + order.Id, order.MerchantPaymentId);
    }

    [Fact]
    public async Task CreateOrder_DefaultsToR70AndR10()
    {
        var service = new StraatfeesService(_db, _payFast.Object, new EmailOutboxService(_db, _email.Object, Mock.Of<ILogger<EmailOutboxService>>()),
            new ConfigurationBuilder().Build(), Mock.Of<ILogger<StraatfeesService>>());

        var (order, _) = await service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan", Email = "jan@test.com", Adults = 2, Children = 1 });

        Assert.Equal(150m, order!.Amount);
    }

    [Theory]
    [InlineData("", "jan@test.com", 1, 0)]
    [InlineData("Jan", "nie-n-epos", 1, 0)]
    [InlineData("Jan", "jan@test.com", 0, 0)]
    [InlineData("Jan", "jan@test.com", 15, 6)]
    [InlineData("Jan", "jan@test.com", -1, 3)]
    public async Task CreateOrder_RejectsBadInput(string name, string email, int adults, int children)
    {
        var (order, error) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = name, Email = email, Adults = adults, Children = children });

        Assert.Null(order);
        Assert.NotNull(error);
        Assert.Empty(_db.StraatfeesOrders);
    }

    [Fact]
    public async Task CreateOrder_AllowsChildrenOnly()
    {
        var (order, error) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan", Email = "jan@test.com", Children = 2 });

        Assert.Null(error);
        Assert.Equal(20m, order!.Amount);
    }

    [Fact]
    public async Task ValidItn_ConfirmsAndEmailsOnce_EvenWhenRepeated()
    {
        var (order, _) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan", Email = "jan@test.com", Adults = 2, Children = 1 });
        _payFast.Setup(p => p.VerifyItnAsync(It.IsAny<string>(), 310m))
            .ReturnsAsync(new ItnVerificationResult(true, "COMPLETE", "pf-1", order!.MerchantPaymentId, 310m, null));

        Assert.True(await _service.HandleItnAsync(order.Id, "raw"));
        Assert.True(await _service.HandleItnAsync(order.Id, "raw"));

        var saved = await _db.StraatfeesOrders.AsNoTracking().SingleAsync();
        Assert.Equal(PaymentStatus.Confirmed, saved.PaymentStatus);
        Assert.Equal("pf-1", saved.PayFastPaymentId);
        Assert.NotNull(saved.TicketEmailSentAt);
        _email.Verify(e => e.SendAsync("jan@test.com", It.IsAny<string>(), It.Is<string>(h => h.Contains(order.TicketCode) && h.Contains("2 volwassenes en 1 kind") && h.Contains("STRAATFEES")), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task InvalidItn_LeavesOrderPending()
    {
        var (order, _) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan", Email = "jan@test.com", Adults = 1 });
        _payFast.Setup(p => p.VerifyItnAsync(It.IsAny<string>(), It.IsAny<decimal>()))
            .ReturnsAsync(new ItnVerificationResult(false, null, null, null, null, "Signature mismatch"));

        Assert.True(await _service.HandleItnAsync(order!.Id, "raw"));

        Assert.Equal(PaymentStatus.Pending, (await _db.StraatfeesOrders.AsNoTracking().SingleAsync()).PaymentStatus);
        _email.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CreateOrder_StoresAnOptionalPhoneAsE164()
    {
        var (withPhone, _) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan", Email = "jan@test.com", PhoneNumber = "082 123 4567", PhoneCountryCode = "+27", Adults = 1 });
        var (without, _) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Piet", Email = "piet@test.com", PhoneNumber = "  ", Adults = 1 });

        Assert.Equal("+27821234567", withPhone!.Phone);
        Assert.Null(without!.Phone);
        Assert.Equal("+27821234567", StraatfeesService.ToAdminDto(withPhone).Phone);
    }

    [Fact]
    public async Task CreateOrder_RejectsABadPhone()
    {
        var (order, error) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan", Email = "jan@test.com", PhoneNumber = "12345", PhoneCountryCode = "+27", Adults = 1 });

        Assert.Null(order);
        Assert.StartsWith("Foonnommer", error);
        Assert.Empty(_db.StraatfeesOrders);
    }

    [Fact]
    public async Task ManualOrder_StoresThePhone()
    {
        var (order, error) = await _service.CreateManualOrderAsync(new StraatfeesManualOrderDto { Name = "Jan", Email = "jan@test.com", PhoneNumber = "0821234567", Adults = 1, PaymentMethod = "Cash" });

        Assert.Null(error);
        Assert.Equal("+27821234567", order!.Phone);
    }

    [Fact]
    public async Task ManualOrder_IsConfirmedAndEmailsTheTicket()
    {
        var (order, error) = await _service.CreateManualOrderAsync(new StraatfeesManualOrderDto { Name = "Jan", Email = "jan@test.com", Adults = 2, Children = 1, PaymentMethod = "eft" });

        Assert.Null(error);
        var saved = await _db.StraatfeesOrders.AsNoTracking().SingleAsync();
        Assert.Equal(PaymentStatus.Confirmed, saved.PaymentStatus);
        Assert.Equal("EFT", saved.PaymentMethod);
        Assert.Equal(310m, saved.Amount);
        Assert.NotNull(saved.ConfirmedAt);
        Assert.NotNull(saved.TicketEmailSentAt);
        _email.Verify(e => e.SendAsync("jan@test.com", It.IsAny<string>(), It.Is<string>(h => h.Contains(order!.TicketCode)), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ManualOrder_IgnoresTheSwitchAndPublicCap()
    {
        await _service.SetEnabledAsync(false);

        var (order, error) = await _service.CreateManualOrderAsync(new StraatfeesManualOrderDto { Name = "Skoolgroep", Email = "skool@test.com", Adults = 5, Children = 40, PaymentMethod = "Cash" });

        Assert.Null(error);
        Assert.Equal(PaymentStatus.Confirmed, order!.PaymentStatus);
        Assert.Equal(45, order.Quantity);
    }

    [Theory]
    [InlineData("", "jan@test.com", 1, 0, "Cash")]
    [InlineData("Jan", "nie-n-epos", 1, 0, "Cash")]
    [InlineData("Jan", "", 1, 0, "Cash")]
    [InlineData("Jan", "  ", 1, 0, "Cash")]
    [InlineData("Jan", "jan@test.com", 0, 0, "Cash")]
    [InlineData("Jan", "jan@test.com", 150, 51, "Cash")]
    [InlineData("Jan", "jan@test.com", 1, 0, "PayFast")]
    [InlineData("Jan", "jan@test.com", 1, 0, "")]
    public async Task ManualOrder_RejectsBadInput(string name, string email, int adults, int children, string method)
    {
        var (order, error) = await _service.CreateManualOrderAsync(new StraatfeesManualOrderDto { Name = name, Email = email, Adults = adults, Children = children, PaymentMethod = method });

        Assert.Null(order);
        Assert.NotNull(error);
        Assert.Empty(_db.StraatfeesOrders);
    }

    [Theory]
    [InlineData(1, 0, "1 volwassene")]
    [InlineData(2, 0, "2 volwassenes")]
    [InlineData(0, 1, "1 kind")]
    [InlineData(3, 4, "3 volwassenes en 4 kinders")]
    public void Admits_NamesAdultsAndChildren(int adults, int children, string expected) =>
        Assert.Equal(expected, EmailTemplates.StraatfeesAdmits(adults, children));

    [Fact]
    public void TicketEmail_IsTheTicketItself_AndEncodesTheName()
    {
        var html = EmailTemplates.StraatfeesTicket("<Jan>", 1, 2, 90m, "ABCDEFGH23", "https://bou.orania.co.za/straatfees/kaartjie/ABCDEFGH23", "https://diamantlaan-sb.azurewebsites.net");

        Assert.Contains("&lt;Jan&gt;", html);
        Assert.DoesNotContain("<Jan>", html);
        Assert.Contains("1 volwassene en 2 kinders", html);
        Assert.Contains("R90", html);
        Assert.Contains("https://diamantlaan-sb.azurewebsites.net/straatfees/epos/hoek-bo.png", html);
        Assert.Contains("href=\"https://bou.orania.co.za/straatfees/kaartjie/ABCDEFGH23\"", html);
        Assert.Contains("Diamantlaan (by Heuwelsig)", html);
        Assert.DoesNotContain("PDF", html);
    }

    [Theory]
    [InlineData("SF-12", true, 12)]
    [InlineData("sf-7", true, 7)]
    [InlineData("12", false, 0)]
    [InlineData("SF-", false, 0)]
    [InlineData(null, false, 0)]
    public void TryParseMerchantPaymentId_OnlyMatchesTicketOrders(string? id, bool expected, int expectedId)
    {
        Assert.Equal(expected, StraatfeesService.TryParseMerchantPaymentId(id, out var orderId));
        Assert.Equal(expectedId, orderId);
    }
}
