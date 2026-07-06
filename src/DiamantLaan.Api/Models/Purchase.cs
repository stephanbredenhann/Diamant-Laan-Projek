using System.ComponentModel.DataAnnotations;
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
    public string? PayFastPaymentId { get; set; }
    public string? PayFastPaymentStatus { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
