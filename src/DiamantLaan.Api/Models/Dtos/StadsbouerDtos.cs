using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

/// <summary>What the public gallery sees. Deliberately without the email address.</summary>
public class StadsbouerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? About { get; set; }
    public bool HasPhoto { get; set; }

    /// <summary>A paid sponsorship. The block already belongs to this builder.</summary>
    public bool IsSponsored { get; set; }

    /// <summary>Someone is part-way through paying for this builder. Not selectable either.</summary>
    public bool IsPending { get; set; }
}

/// <summary>The admin view: everything above plus the email the account gets created under.</summary>
public class AdminStadsbouerDto : StadsbouerDto
{
    public string? Email { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class StadsbouerUploadDto
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Title { get; set; }

    [MaxLength(2000)]
    public string? About { get; set; }

    [MaxLength(254)]
    public string? Email { get; set; }

    public bool IsActive { get; set; } = true;
}

public class StadsbouersEnabledDto
{
    public bool Enabled { get; set; }
}
