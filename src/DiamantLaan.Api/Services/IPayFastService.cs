using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;

namespace DiamantLaan.Api.Services;

public interface IPayFastService
{
    string CreateSignature(IReadOnlyDictionary<string, string> data);
    PayFastPaymentRequestDto CreatePaymentRequest(Purchase purchase, User user, string baseUrl);
    PayFastPaymentRequestDto CreateStraatfeesPaymentRequest(StraatfeesOrder order, string baseUrl);
    Task<ItnVerificationResult> VerifyItnAsync(string rawBody, decimal expectedAmount);
}
