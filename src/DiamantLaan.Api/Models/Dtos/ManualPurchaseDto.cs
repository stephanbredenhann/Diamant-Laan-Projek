using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class ManualPurchaseDto
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Phone, MaxLength(20)]
    public string? PhoneNumber { get; set; }

    public bool IsOraniaResident { get; set; }

    [Required, MinLength(1), MaxLength(100)]
    public List<int> SquareIds { get; set; } = new();

    [Range(500, 1000000)]
    public decimal AmountPaid { get; set; }
}
