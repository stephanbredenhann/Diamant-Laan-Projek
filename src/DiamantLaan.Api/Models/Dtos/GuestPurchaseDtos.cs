using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class GuestPurchaseRequestDto
{
    [Required, MinLength(1), MaxLength(100)]
    public List<int> SquareIds { get; set; } = new();

    /// <summary>
    /// Where the confirmation and the "create an account later" link are sent. Required, because
    /// it is the only way back to a purchase that was made without an account.
    /// </summary>
    [Required, MaxLength(254)]
    public string Email { get; set; } = string.Empty;
}

public class GuestTokenDto
{
    [Required, MaxLength(128)]
    public string Token { get; set; } = string.Empty;
}

public class GuestCertificateNameDto : GuestTokenDto
{
    /// <summary>The name on the summary certificate, and the fallback for every block.</summary>
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>False when each block of this purchase gets its own name from <see cref="Blocks"/>.</summary>
    public bool SameForAll { get; set; } = true;

    /// <summary>Per-block names. Ignored when <see cref="SameForAll"/> is true.</summary>
    public List<BlockCertificateNameDto> Blocks { get; set; } = new();
}

public class GuestClaimDto : GuestTokenDto
{
    [Required]
    public int PurchaseId { get; set; }
}
