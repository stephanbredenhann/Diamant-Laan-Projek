namespace DiamantLaan.Api.Models.Dtos;

public record ItnVerificationResult(
    bool IsValid,
    string? PaymentStatus,
    string? PayFastPaymentId,
    string? MerchantPaymentId,
    decimal? AmountGross,
    string? Error);
