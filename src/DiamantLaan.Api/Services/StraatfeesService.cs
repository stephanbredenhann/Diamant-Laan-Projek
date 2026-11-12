using System.Security.Cryptography;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Validation;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

/// <summary>
/// Straatfees ticket sales: no account, one form (name, email, adults and children), paid through the same
/// PayFast merchant and ITN endpoint as the blocks. A paid order gets its ticket by email and on
/// a page keyed by the order's random ticket code.
/// </summary>
public class StraatfeesService
{
    public const int MaxPerOrder = 20;
    public const decimal DefaultAdultPrice = 70m;
    public const decimal DefaultChildPrice = 10m;

    private readonly AppDbContext _db;
    private readonly IPayFastService _payFast;
    private readonly EmailOutboxService _emails;
    private readonly IConfiguration _config;
    private readonly ILogger<StraatfeesService> _logger;

    public StraatfeesService(
        AppDbContext db,
        IPayFastService payFast,
        EmailOutboxService emails,
        IConfiguration config,
        ILogger<StraatfeesService> logger)
    {
        _db = db;
        _payFast = payFast;
        _emails = emails;
        _config = config;
        _logger = logger;
    }

    /// <summary>R70 per adult unless Straatfees:AdultPrice says otherwise.</summary>
    public decimal AdultPrice => Price("Straatfees:AdultPrice", DefaultAdultPrice);

    /// <summary>R10 per child unless Straatfees:ChildPrice says otherwise.</summary>
    public decimal ChildPrice => Price("Straatfees:ChildPrice", DefaultChildPrice);

    private decimal Price(string key, decimal fallback) =>
        decimal.TryParse(_config[key], System.Globalization.NumberStyles.Number,
            System.Globalization.CultureInfo.InvariantCulture, out var price) && price > 0
            ? price
            : fallback;

    public async Task<bool> IsEnabledAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        return settings?.StraatfeesEnabled ?? true;
    }

    public async Task<bool> SetEnabledAsync(bool enabled)
    {
        var settings = await _db.SiteSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new SiteSettings { Id = 1 };
            _db.SiteSettings.Add(settings);
        }

        settings.StraatfeesEnabled = enabled;
        await _db.SaveChangesAsync();
        return settings.StraatfeesEnabled;
    }

    /// <summary>Returns the new order, or an Afrikaans error message for the buyer.</summary>
    public async Task<(StraatfeesOrder? Order, string? Error)> CreateOrderAsync(StraatfeesOrderRequestDto dto)
    {
        var name = dto.Name?.Trim() ?? "";
        var email = dto.Email?.Trim() ?? "";

        if (name.Length is < 2 or > 120)
            return (null, "Vul asseblief jou naam in.");
        if (!EmailValidator.IsValid(email, out _))
            return (null, "Vul asseblief ’n geldige e-posadres in.");
        if (dto.Adults < 0 || dto.Children < 0 || dto.Adults + dto.Children is < 1 or > MaxPerOrder)
            return (null, $"Kies tussen 1 en {MaxPerOrder} kaartjies.");

        var adultPrice = AdultPrice;
        var childPrice = ChildPrice;
        var order = new StraatfeesOrder
        {
            Name = name,
            Email = email,
            Adults = dto.Adults,
            Children = dto.Children,
            AdultUnitPrice = adultPrice,
            ChildUnitPrice = childPrice,
            Amount = adultPrice * dto.Adults + childPrice * dto.Children,
            TicketCode = NewTicketCode(),
            CreatedAt = DateTime.UtcNow
        };

        _db.StraatfeesOrders.Add(order);
        await _db.SaveChangesAsync();
        return (order, null);
    }

    public PayFastPaymentRequestDto PaymentFormFor(StraatfeesOrder order, string baseUrl) =>
        _payFast.CreateStraatfeesPaymentRequest(order, baseUrl);

    public Task<StraatfeesOrder?> FindByCodeAsync(string code) =>
        _db.StraatfeesOrders.AsNoTracking().FirstOrDefaultAsync(o => o.TicketCode == code);

    public static bool TryParseMerchantPaymentId(string? merchantPaymentId, out int orderId)
    {
        orderId = 0;
        return merchantPaymentId != null
            && merchantPaymentId.StartsWith(StraatfeesOrder.PaymentIdPrefix, StringComparison.OrdinalIgnoreCase)
            && int.TryParse(merchantPaymentId[StraatfeesOrder.PaymentIdPrefix.Length..], out orderId);
    }

    /// <summary>
    /// Handles a PayFast ITN for a ticket order. Returns false only when the confirmation itself
    /// failed, so the caller can answer 500 and PayFast retries; everything else is "OK".
    /// </summary>
    public async Task<bool> HandleItnAsync(int orderId, string rawBody)
    {
        var order = await _db.StraatfeesOrders.FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null)
        {
            _logger.LogWarning("PayFast ITN for unknown straatfees order {OrderId}", orderId);
            return true;
        }

        var result = await _payFast.VerifyItnAsync(rawBody, order.Amount);
        if (!result.IsValid)
        {
            _logger.LogWarning("PayFast ITN validation failed for straatfees order {OrderId}: {Error}", orderId, result.Error);
            return true;
        }

        return await ConfirmAsync(order, result.PayFastPaymentId!, result.PaymentStatus!);
    }

    /// <summary>Marks the order paid and emails the ticket once. A repeated ITN is a no-op.</summary>
    public async Task<bool> ConfirmAsync(StraatfeesOrder order, string payFastPaymentId, string paymentStatus)
    {
        if (order.PaymentStatus == PaymentStatus.Pending)
        {
            order.PaymentStatus = PaymentStatus.Confirmed;
            order.PayFastPaymentId = payFastPaymentId;
            order.PayFastPaymentStatus = paymentStatus;
            order.ConfirmedAt = DateTime.UtcNow;

            try
            {
                await _db.SaveChangesAsync();
                _logger.LogInformation("Straatfees order {OrderId} confirmed", order.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming straatfees order {OrderId}", order.Id);
                return false;
            }
        }

        await SendTicketEmailAsync(order);
        return true;
    }

    private async Task SendTicketEmailAsync(StraatfeesOrder order)
    {
        if (order.PaymentStatus != PaymentStatus.Confirmed || order.TicketEmailSentAt != null)
            return;

        try
        {
            // Stamped before queueing: the outbox retries a failed send itself, so a second ITN
            // must never queue a second copy.
            order.TicketEmailSentAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var site = AppPublicUrl.Resolve(_config).TrimEnd('/');
            var ticketUrl = $"{site}/straatfees/kaartjie/{Uri.EscapeDataString(order.TicketCode)}";
            await _emails.QueueAsync(
                order.Email,
                "Straatfees: jou kaartjie",
                EmailTemplates.StraatfeesTicket(order.Name, order.Adults, order.Children, order.Amount, order.TicketCode, ticketUrl, AppPublicUrl.AssetHost(_config)));
        }
        catch (Exception ex)
        {
            // The money is in; a mail failure must not make PayFast retry the ITN.
            _logger.LogError(ex, "Could not send ticket email for straatfees order {OrderId}", order.Id);
        }
    }

    public async Task<List<StraatfeesAdminOrderDto>> ListAsync() =>
        (await _db.StraatfeesOrders.AsNoTracking().ToListAsync())
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new StraatfeesAdminOrderDto
            {
                Id = o.Id,
                Name = o.Name,
                Email = o.Email,
                Adults = o.Adults,
                Children = o.Children,
                Amount = o.Amount,
                TicketCode = o.TicketCode,
                Status = o.PaymentStatus.ToString(),
                PayFastPaymentId = o.PayFastPaymentId,
                CreatedAt = o.CreatedAt,
                ConfirmedAt = o.ConfirmedAt,
                TicketEmailSent = o.TicketEmailSentAt != null
            })
            .ToList();

    /// <summary>Ten characters from an alphabet with no 0/O or 1/I, so it reads off a phone at the gate.</summary>
    private static string NewTicketCode()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return RandomNumberGenerator.GetString(alphabet, 10);
    }
}
