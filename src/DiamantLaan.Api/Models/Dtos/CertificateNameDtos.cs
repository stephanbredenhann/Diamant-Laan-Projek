using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

/// <summary>What the certificate page saves: one name for everything, or one per certificate.</summary>
public class SaveCertificateNamesDto
{
    /// <summary>True when the one name below is to be printed on every certificate.</summary>
    public bool SameForAll { get; set; }

    /// <summary>The name on the summary certificate, and the fallback for every block.</summary>
    [Required]
    [MaxLength(100)]
    public string SummaryName { get; set; } = string.Empty;

    /// <summary>Per-block overrides. Ignored when <see cref="SameForAll"/> is true.</summary>
    public List<BlockCertificateNameDto> Blocks { get; set; } = new();
}

public class BlockCertificateNameDto
{
    public int SquareId { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Response only: false once this block's 15-minute window has closed.</summary>
    public bool CanEdit { get; set; }
}

/// <summary>The names as they stand, with every block already resolved to what it will print.</summary>
public class CertificateNamesDto
{
    public bool SameForAll { get; set; }
    public string SummaryName { get; set; } = string.Empty;
    public List<BlockCertificateNameDto> Blocks { get; set; } = new();

    /// <summary>True while at least one block is still inside its 15-minute window.</summary>
    public bool CanEdit { get; set; }

    /// <summary>When the last open window closes. Null once everything is locked.</summary>
    public DateTime? EditableUntil { get; set; }
}
