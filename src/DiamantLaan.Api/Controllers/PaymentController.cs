using System.IO;
using System.Text;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPayFastService _payFastService;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(AppDbContext db, IPayFastService payFastService, ILogger<PaymentController> logger)
    {
        _db = db;
        _payFastService = payFastService;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("itn")]
    public async Task<IActionResult> Itn()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var rawBody = await reader.ReadToEndAsync();

        _logger.LogInformation("PayFast ITN received: {Body}", rawBody);

        var merchantPaymentId = ExtractMerchantPaymentId(rawBody);
        if (string.IsNullOrEmpty(merchantPaymentId) || !int.TryParse(merchantPaymentId, out var purchaseId))
        {
            _logger.LogWarning("PayFast ITN missing merchant payment id");
            return Ok("OK");
        }

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .FirstOrDefaultAsync(p => p.Id == purchaseId);

        if (purchase == null)
        {
            _logger.LogWarning("PayFast ITN for unknown purchase {PurchaseId}", purchaseId);
            return Ok("OK");
        }

        var result = await _payFastService.VerifyItnAsync(rawBody, purchase.Amount);

        if (!result.IsValid)
        {
            _logger.LogWarning("PayFast ITN validation failed for purchase {PurchaseId}: {Error}", purchaseId, result.Error);
            return Ok("OK");
        }

        if (purchase.PaymentStatus == PaymentStatus.Confirmed)
        {
            _logger.LogInformation("PayFast ITN for already confirmed purchase {PurchaseId}", purchaseId);
            return Ok("OK");
        }

        if (purchase.PaymentStatus == PaymentStatus.Cancelled)
        {
            _logger.LogWarning("PayFast ITN for cancelled purchase {PurchaseId}", purchaseId);
            return Ok("OK");
        }

        purchase.PaymentStatus = PaymentStatus.Confirmed;
        purchase.PayFastPaymentId = result.PayFastPaymentId;
        purchase.PayFastPaymentStatus = result.PaymentStatus;
        purchase.ConfirmedAt = DateTime.UtcNow;

        var userId = purchase.UserId;
        foreach (var ps in purchase.PurchaseSquares)
        {
            var square = await _db.Squares.FindAsync(ps.SquareId);
            if (square != null)
                square.OwnerId = userId;
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Purchase {PurchaseId} confirmed by PayFast ITN", purchaseId);

        return Ok("OK");
    }

    private static string? ExtractMerchantPaymentId(string rawBody)
    {
        foreach (var part in rawBody.Split('&'))
        {
            var idx = part.IndexOf('=');
            if (idx < 0) continue;
            var key = part[..idx];
            if (key.Equals("m_payment_id", StringComparison.OrdinalIgnoreCase))
                return part[(idx + 1)..];
        }
        return null;
    }
}
