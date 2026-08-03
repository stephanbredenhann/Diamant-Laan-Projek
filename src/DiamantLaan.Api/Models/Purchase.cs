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

    /// <summary>
    /// SHA-256 hash of the bearer token handed to a guest buyer, or null for a normal purchase.
    /// The plain token is only ever returned once, when the guest purchase is created.
    /// </summary>
    public string? GuestTokenHash { get; set; }

    /// <summary>
    /// Optional email the guest supplied before being sent to PayFast, or the payer email
    /// reported by the ITN. Used for receipts and for claiming the purchase later.
    /// </summary>
    public string? GuestEmail { get; set; }

    /// <summary>
    /// SHA-256 hash of the IP address that created a guest purchase, used only to cap how many
    /// reservations one source may hold at a time. Never stored in the clear.
    /// </summary>
    public string? GuestIpHash { get; set; }

    /// <summary>
    /// SHA-256 hash of the long-lived token embedded in the "create an account later" email.
    /// The plain token exists only in that email, in the same spirit as the password reset code.
    /// </summary>
    public string? ClaimTokenHash { get; set; }

    /// <summary>When the emailed claim link stops working.</summary>
    public DateTime? ClaimTokenExpiresAt { get; set; }

    /// <summary>Set once the claim email has been queued, so it is never sent twice.</summary>
    public DateTime? ClaimEmailSentAt { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
