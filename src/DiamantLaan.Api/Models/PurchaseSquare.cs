namespace DiamantLaan.Api.Models;

public class PurchaseSquare
{
    public int PurchaseId { get; set; }
    public Purchase Purchase { get; set; } = null!;
    public int SquareId { get; set; }
    public Square Square { get; set; } = null!;

    /// <summary>
    /// Set when this block was bought for a road builder rather than for the payer. It is the only
    /// sponsorship state stored: a builder counts as taken while a row like this belongs to a
    /// pending or confirmed purchase, so cancelling frees them again for free.
    /// </summary>
    public int? StadsbouerId { get; set; }
    public Stadsbouer? Stadsbouer { get; set; }
}
