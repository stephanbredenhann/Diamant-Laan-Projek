using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models.Dtos;

public class SquareDto
{
    public int Id { get; set; }
    public SquareStatus Status { get; set; }
    public bool IsSold { get; set; }
    public int ImageCount { get; set; }
}
