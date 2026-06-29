using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

public class Purchase
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public string? ProofOfPaymentPath { get; set; }
    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
