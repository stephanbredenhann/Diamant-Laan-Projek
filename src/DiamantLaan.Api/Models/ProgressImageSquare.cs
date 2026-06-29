namespace DiamantLaan.Api.Models;

public class ProgressImageSquare
{
    public int ProgressImageId { get; set; }
    public ProgressImage ProgressImage { get; set; } = null!;
    public int SquareId { get; set; }
    public Square Square { get; set; } = null!;
}
