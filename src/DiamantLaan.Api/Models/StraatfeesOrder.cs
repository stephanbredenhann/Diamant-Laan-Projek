using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

/// <summary>
/// One ticket purchase for the straatfees. Deliberately not a <see cref="Purchase"/>: there is no
/// account, no block and no certificate behind it, only a name, an email and a count of adults and children.
/// </summary>
public class StraatfeesOrder
{
    /// <summary>PayFast's m_payment_id is this prefix plus <see cref="Id"/>, so the ITN can tell a ticket from a block.</summary>
    public const string PaymentIdPrefix = "SF-";

    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Optional, in E.164 form (+27821234567), so the organisers can phone a buyer on the day.</summary>
    public string? Phone { get; set; }
    public int Adults { get; set; }
    public int Children { get; set; }

    /// <summary>Prices at the time of the order, so a later price change does not rewrite old tickets.</summary>
    public decimal AdultUnitPrice { get; set; }
    public decimal ChildUnitPrice { get; set; }
    public decimal Amount { get; set; }

    /// <summary>Everyone the ticket admits.</summary>
    public int Quantity => Adults + Children;

    /// <summary>
    /// Random and unguessable. It is printed on the ticket and is the only key to the ticket page,
    /// which is what lets a buyer without an account download their ticket again from the email.
    /// </summary>
    public string TicketCode { get; set; } = string.Empty;

    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

    /// <summary>
    /// How an admin-recorded sale was paid (EFT, Cash, Card). Null for an online order, which is
    /// always PayFast.
    /// </summary>
    public string? PaymentMethod { get; set; }

    public bool IsManual => PaymentMethod != null;
    public string? PayFastPaymentId { get; set; }
    public string? PayFastPaymentStatus { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? TicketEmailSentAt { get; set; }

    public string MerchantPaymentId => PaymentIdPrefix + Id;
}
