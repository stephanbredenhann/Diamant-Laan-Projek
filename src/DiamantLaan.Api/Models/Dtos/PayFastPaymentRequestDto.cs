namespace DiamantLaan.Api.Models.Dtos;

public class PayFastPaymentRequestDto
{
    public string ActionUrl { get; set; } = string.Empty;
    public IDictionary<string, string> Fields { get; set; } = new Dictionary<string, string>();
}
