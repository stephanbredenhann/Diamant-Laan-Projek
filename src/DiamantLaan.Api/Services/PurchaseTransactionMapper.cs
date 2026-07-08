using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Services;

public static class PurchaseTransactionMapper
{
    public static PurchaseTransactionDto ToDto(Purchase purchase, bool includeUser = false)
    {
        var squareCount = purchase.PurchaseSquares.Count;
        var user = purchase.User;
        return new PurchaseTransactionDto
        {
            Id = purchase.Id,
            PurchaseDate = purchase.PurchaseDate,
            Amount = purchase.Amount,
            SquareCount = squareCount,
            AmountPerBlock = squareCount > 0 ? purchase.Amount / squareCount : 0,
            SquareIds = purchase.PurchaseSquares
                .Select(ps => ps.SquareId)
                .OrderBy(id => id)
                .ToList(),
            PaymentStatus = purchase.PaymentStatus.ToString(),
            UserName = includeUser && user != null
                ? $"{user.FirstName} {user.LastName}".Trim()
                : includeUser ? "Onbekend" : null,
            UserEmail = includeUser ? user?.Email : null,
            PayFastPaymentId = includeUser ? purchase.PayFastPaymentId : null,
            PurchaseSource = GetPurchaseSource(purchase)
        };
    }

    private static string GetPurchaseSource(Purchase purchase) =>
        !string.IsNullOrEmpty(purchase.PayFastPaymentId) || purchase.PaymentStatus != PaymentStatus.Confirmed
            ? "PayFast"
            : "TelefonieseAankoop";
}
