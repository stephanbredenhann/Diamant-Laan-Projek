using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class BulkReserveDto
{
    [Required, MinLength(1), MaxLength(500)]
    public List<int> SquareIds { get; set; } = new();

    /// <summary>True holds the blocks back from public sale, false releases them again.</summary>
    [Required]
    public bool Reserved { get; set; }
}
