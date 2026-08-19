using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models.Dtos;

public class SquareDto
{
    public int Id { get; set; }
    public SquareStatus Status { get; set; }
    public bool IsSold { get; set; }
    public bool IsReserved { get; set; }

    /// <summary>
    /// Held by a purchase whose payment has not been confirmed yet. Not buyable, but not sold
    /// either: the map draws it as reserved until the ITN lands, and only then turns it red.
    /// </summary>
    public bool IsPending { get; set; }
    public int ImageCount { get; set; }
}
