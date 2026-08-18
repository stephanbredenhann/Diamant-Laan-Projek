using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class DeleteTransactionDto
{
    /// <summary>The admin's own password, re-entered because deleting a transaction cannot be undone.</summary>
    [Required]
    public string Password { get; set; } = string.Empty;
}
