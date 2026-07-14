using System.ComponentModel.DataAnnotations;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models.Dtos;

public class ProgressImageUploadDto
{
    [Required, MinLength(1), MaxLength(500)]
    public List<int> SquareIds { get; set; } = new();

    [Required]
    public SquareStatus Status { get; set; }

    public string? Caption { get; set; }

    public bool ReplaceExisting { get; set; }

    /// <summary>Optional GUID shared with a preceding status update in the same Stoor action.</summary>
    [MaxLength(64)]
    public string? UndoBatchId { get; set; }
}
