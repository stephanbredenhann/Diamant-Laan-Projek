using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class MakeAdminDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}
