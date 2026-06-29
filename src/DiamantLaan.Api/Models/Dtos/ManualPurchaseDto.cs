using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class ManualPurchaseDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Phone]
    public string? PhoneNumber { get; set; }

    public bool IsOraniaResident { get; set; }

    [Required, MinLength(1)]
    public List<int> SquareIds { get; set; } = new();

    [Range(500, double.MaxValue)]
    public decimal AmountPaid { get; set; }
}
