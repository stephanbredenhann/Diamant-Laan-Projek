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
[Authorize]
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

        var merchantPaymentId = ExtractMerchantPaymentId(rawBody);
        var pfPaymentId = ExtractValue(rawBody, "pf_payment_id");
        var paymentStatus = ExtractValue(rawBody, "payment_status");

        _logger.LogInformation(
            "PayFast ITN received for m_payment_id={MerchantPaymentId}, pf_payment_id={PfPaymentId}, payment_status={PaymentStatus}",
            merchantPaymentId, pfPaymentId, paymentStatus);

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

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            await _db.Entry(purchase).ReloadAsync();

            if (purchase.PaymentStatus != PaymentStatus.Pending)
            {
                _logger.LogInformation("PayFast ITN for non-pending purchase {PurchaseId} after verification", purchaseId);
                await transaction.RollbackAsync();
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
            await transaction.CommitAsync();
            _logger.LogInformation("Purchase {PurchaseId} confirmed by PayFast ITN", purchaseId);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogWarning(ex, "Concurrency conflict confirming purchase {PurchaseId}", purchaseId);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error confirming purchase {PurchaseId} from ITN", purchaseId);
        }

        return Ok("OK");
    }

    private static string? ExtractMerchantPaymentId(string rawBody) => ExtractValue(rawBody, "m_payment_id");

    private static string? ExtractValue(string rawBody, string key)
    {
        foreach (var part in rawBody.Split('&'))
        {
            var idx = part.IndexOf('=');
            if (idx < 0) continue;
            var partKey = part[..idx];
            if (partKey.Equals(key, StringComparison.OrdinalIgnoreCase))
                return Uri.UnescapeDataString(part[(idx + 1)..]);
        }
        return null;
    }
}
