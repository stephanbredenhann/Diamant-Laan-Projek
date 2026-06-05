using System.ComponentModel.DataAnnotations;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models.Dtos;

public class BulkStatusUpdateDto
{
    [Required, MinLength(1)]
    public List<int> SquareIds { get; set; } = new();
    [Required]
    public SquareStatus Status { get; set; }
}
