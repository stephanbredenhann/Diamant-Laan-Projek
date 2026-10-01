using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models;

/// <summary>
/// Someone physically building the road, who visitors can sponsor a block for. The block ends up
/// registered to them: <see cref="Email"/> is what the account is created under, so it is never
/// returned by the public endpoint. Optional: a paid block waits with a holding account until it is filled in.
/// </summary>
public class Stadsbouer
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Title { get; set; }

    [MaxLength(2000)]
    public string? About { get; set; }

    [MaxLength(254)]
    public string? Email { get; set; }

    /// <summary>Relative path under the uploads root, e.g. "stadsbouers/3.jpg". Null until a photo is added.</summary>
    [MaxLength(260)]
    public string? PhotoPath { get; set; }

    /// <summary>Cleared instead of deleted once someone has been sponsored and must stay off the gallery.</summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>When the printed certificate was handed over. Null until then.</summary>
    public DateTime? HandedOverAt { get; set; }

    /// <summary>Relative path of the handover photo, e.g. "stadsbouers/oorhandig-&lt;guid&gt;.jpg".</summary>
    [MaxLength(260)]
    public string? HandoverPhotoPath { get; set; }

    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
