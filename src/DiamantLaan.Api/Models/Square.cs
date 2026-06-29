using System.ComponentModel.DataAnnotations;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

public class Square
{
    public int Id { get; set; }
    public SquareStatus Status { get; set; } = SquareStatus.NogNieBeginNie;
    public string? OwnerId { get; set; }
    public User? Owner { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
