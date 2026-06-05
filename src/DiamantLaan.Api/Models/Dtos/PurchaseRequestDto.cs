using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class PurchaseRequestDto
{
    [Required, MinLength(1)]
    public List<int> SquareIds { get; set; } = new();
}
