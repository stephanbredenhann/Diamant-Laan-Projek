namespace DiamantLaan.Api.Models;

public class PayFastSettings
{
    public string MerchantId { get; set; } = string.Empty;
    public string MerchantKey { get; set; } = string.Empty;
    public string Passphrase { get; set; } = string.Empty;
    public bool Sandbox { get; set; } = true;
    public string? ProcessUrl { get; set; }
    public string? QueryUrl { get; set; }
    public string? NotifyUrl { get; set; }

    /// <summary>
    /// Base URL of the frontend (e.g. https://example.com/).
    /// Used for return_url and cancel_url. If omitted, the API base URL is used.
    /// </summary>
    public string? FrontendBaseUrl { get; set; }
}
