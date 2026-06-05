namespace DiamantLaan.Api.Models;

public class PurchaseSquare
{
    public int PurchaseId { get; set; }
    public Purchase Purchase { get; set; } = null!;
    public int SquareId { get; set; }
    public Square Square { get; set; } = null!;
}
