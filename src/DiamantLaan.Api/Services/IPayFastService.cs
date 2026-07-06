namespace DiamantLaan.Api.Services;

public interface IPayFastService
{
    string CreateSignature(IReadOnlyDictionary<string, string> data);
}
