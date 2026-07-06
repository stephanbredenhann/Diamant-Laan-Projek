namespace DiamantLaan.Api.Models.Dtos;

public class SimulateItnDto
{
    public int PurchaseId { get; set; }
    public string Status { get; set; } = "COMPLETE";
    public string? PaymentId { get; set; }
}
