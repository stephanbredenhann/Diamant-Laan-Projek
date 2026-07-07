namespace DiamantLaan.Api.Models.Dtos;

public class PurchaseTransactionDto
{
    public int Id { get; set; }
    public DateTime PurchaseDate { get; set; }
    public decimal Amount { get; set; }
    public int SquareCount { get; set; }
    public decimal AmountPerBlock { get; set; }
    public List<int> SquareIds { get; set; } = new();
    public string PaymentStatus { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string? PayFastPaymentId { get; set; }
}
