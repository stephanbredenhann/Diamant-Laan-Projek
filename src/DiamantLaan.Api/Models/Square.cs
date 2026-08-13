using System.ComponentModel.DataAnnotations;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

public class Square
{
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
