namespace DiamantLaan.Api.Services;

public interface IPayFastService
{
    string CreateSignature(IDictionary<string, string> data);
}
