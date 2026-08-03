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
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}

public class GuestClaimDto : GuestTokenDto
{
    [Required]
    public int PurchaseId { get; set; }
}
