using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class PurchaseRequestDto
{
    [Required, MinLength(1), MaxLength(100)]
    public List<int> SquareIds { get; set; } = new();

    /// <summary>
    /// When present, one road builder per entry in <see cref="SquareIds"/>, paired by index: the
    /// block is bought for them and lands on their account once the payment confirms.
    /// </summary>
    [MaxLength(100)]
    public List<int>? StadsbouerIds { get; set; }

    public decimal? Amount { get; set; }

    /// <summary>Ignored — real payment confirmation happens via PayFast ITN.</summary>
    public bool ConfirmPayment { get; set; } = true;
}
