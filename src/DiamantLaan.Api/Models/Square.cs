using System.ComponentModel.DataAnnotations;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

public class Square
{
    /// <summary>
    /// Highest block that is actually on sale. The DB seeds rows past this as headroom
    /// beyond the current road. RoadController and PurchaseController still carry their
    /// own copies of this number; new code should use this one.
    /// </summary>
    public const int MaxSaleableId = 4000;

    public int Id { get; set; }
    public SquareStatus Status { get; set; } = SquareStatus.NogNieBeginNie;
    public string? OwnerId { get; set; }
    public User? Owner { get; set; }

    /// <summary>Held back by an admin: not publicly buyable, still sellable via manual purchase.</summary>
    public bool IsReserved { get; set; }

    /// <summary>
    /// Name printed on this block's own certificate, when the owner wants it to differ from the
    /// one on the rest. Null means fall back to the owner's summary certificate name.
    /// </summary>
    [MaxLength(100)]
    public string? CertificateName { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
