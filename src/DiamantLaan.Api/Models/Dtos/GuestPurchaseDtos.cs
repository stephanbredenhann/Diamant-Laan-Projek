using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class GuestPurchaseRequestDto
{
    [Required, MinLength(1), MaxLength(100)]
    public List<int> SquareIds { get; set; } = new();

    /// <summary>Optional. Lets us send a receipt and a link to claim the purchase later.</summary>
    [MaxLength(254)]
    public string? Email { get; set; }
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
