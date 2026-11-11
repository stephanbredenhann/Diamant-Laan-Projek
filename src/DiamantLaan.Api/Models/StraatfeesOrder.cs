using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

/// <summary>
/// One ticket purchase for the straatfees. Deliberately not a <see cref="Purchase"/>: there is no
/// account, no block and no certificate behind it, only a name, an email and a ticket count.
/// </summary>
public class StraatfeesOrder
{
    /// <summary>PayFast's m_payment_id is this prefix plus <see cref="Id"/>, so the ITN can tell a ticket from a block.</summary>
    public const string PaymentIdPrefix = "SF-";

    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    /// <summary>
    /// Random and unguessable. It is printed on the ticket and is the only key to the ticket page,
    /// which is what lets a buyer without an account download their ticket again from the email.
    /// </summary>
    public string TicketCode { get; set; } = string.Empty;

    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public string? PayFastPaymentId { get; set; }
    public string? PayFastPaymentStatus { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? TicketEmailSentAt { get; set; }

    public string MerchantPaymentId => PaymentIdPrefix + Id;
}
