using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;

namespace DiamantLaan.Api.Services;

public static class PurchaseTransactionMapper
{
    public static PurchaseTransactionDto ToDto(Purchase purchase, bool includeUser = false)
    {
        var squareCount = purchase.PurchaseSquares.Count;
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
            UserName = includeUser ? $"{purchase.User.FirstName} {purchase.User.LastName}".Trim() : null,
            UserEmail = includeUser ? purchase.User.Email : null,
            PayFastPaymentId = includeUser ? purchase.PayFastPaymentId : null
        };
    }
}
