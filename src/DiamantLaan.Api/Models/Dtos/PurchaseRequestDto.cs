using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class PurchaseRequestDto
{
    [Required, MinLength(1), MaxLength(100)]
    public List<int> SquareIds { get; set; } = new();

    public decimal? Amount { get; set; }
}
