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
            UserName = includeUser ? DescribeBuyer(user) : null,
            UserEmail = includeUser ? user?.Email ?? purchase.GuestEmail : null,
            PayFastPaymentId = includeUser ? purchase.PayFastPaymentId : null,
            PurchaseSource = GetPurchaseSource(purchase),
            HasProof = !string.IsNullOrEmpty(purchase.ProofOfPaymentPath)
        };
    }

    /// <summary>
    /// Names the buyer for the admin views. A guest who never created an account has only whatever
    /// name PayFast reported, or none at all.
    /// </summary>
    private static string DescribeBuyer(User? user)
    {
        if (user == null)
            return "Onbekend";

        var name = $"{user.FirstName} {user.LastName}".Trim();

        if (user.IsGuest)
            return string.IsNullOrEmpty(name) ? "Gas (geen rekening)" : $"{name} (gas, geen rekening)";

        return string.IsNullOrEmpty(name) ? "Onbekend" : name;
    }

    public static bool IsTelefonieseAankoop(Purchase purchase) =>
        string.IsNullOrEmpty(purchase.PayFastPaymentId) && purchase.PaymentStatus == PaymentStatus.Confirmed;

    private static string GetPurchaseSource(Purchase purchase) =>
        IsTelefonieseAankoop(purchase) ? "TelefonieseAankoop" : "PayFast";
}
