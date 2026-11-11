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
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Straatfees:TicketPrice"] = "150" })
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
    public async Task CreateOrder_PricesFromConfigAndIssuesCode()
    {
        var (order, error) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan Steyn", Email = "jan@test.com", Quantity = 3 });

        Assert.Null(error);
        Assert.NotNull(order);
        Assert.Equal(450m, order!.Amount);
        Assert.Equal(10, order.TicketCode.Length);
        Assert.Equal(PaymentStatus.Pending, order.PaymentStatus);
        Assert.Equal("SF-" + order.Id, order.MerchantPaymentId);
    }

    [Theory]
    [InlineData("", "jan@test.com", 1)]
    [InlineData("Jan", "nie-n-epos", 1)]
    [InlineData("Jan", "jan@test.com", 0)]
    [InlineData("Jan", "jan@test.com", 21)]
    public async Task CreateOrder_RejectsBadInput(string name, string email, int quantity)
    {
        var (order, error) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = name, Email = email, Quantity = quantity });

        Assert.Null(order);
        Assert.NotNull(error);
        Assert.Empty(_db.StraatfeesOrders);
    }

    [Fact]
    public async Task ValidItn_ConfirmsAndEmailsOnce_EvenWhenRepeated()
    {
        var (order, _) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan", Email = "jan@test.com", Quantity = 2 });
        _payFast.Setup(p => p.VerifyItnAsync(It.IsAny<string>(), 300m))
            .ReturnsAsync(new ItnVerificationResult(true, "COMPLETE", "pf-1", order!.MerchantPaymentId, 300m, null));

        Assert.True(await _service.HandleItnAsync(order.Id, "raw"));
        Assert.True(await _service.HandleItnAsync(order.Id, "raw"));

        var saved = await _db.StraatfeesOrders.AsNoTracking().SingleAsync();
        Assert.Equal(PaymentStatus.Confirmed, saved.PaymentStatus);
        Assert.Equal("pf-1", saved.PayFastPaymentId);
        Assert.NotNull(saved.TicketEmailSentAt);
        _email.Verify(e => e.SendAsync("jan@test.com", It.IsAny<string>(), It.Is<string>(h => h.Contains(order.TicketCode)), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task InvalidItn_LeavesOrderPending()
    {
        var (order, _) = await _service.CreateOrderAsync(new StraatfeesOrderRequestDto { Name = "Jan", Email = "jan@test.com", Quantity = 1 });
        _payFast.Setup(p => p.VerifyItnAsync(It.IsAny<string>(), It.IsAny<decimal>()))
            .ReturnsAsync(new ItnVerificationResult(false, null, null, null, null, "Signature mismatch"));

        Assert.True(await _service.HandleItnAsync(order!.Id, "raw"));

        Assert.Equal(PaymentStatus.Pending, (await _db.StraatfeesOrders.AsNoTracking().SingleAsync()).PaymentStatus);
        _email.VerifyNoOtherCalls();
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
