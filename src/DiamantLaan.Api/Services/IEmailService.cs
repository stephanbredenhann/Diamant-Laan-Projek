namespace DiamantLaan.Api.Services;

public interface IEmailService
{
    Task<bool> SendAsync(string to, string subject, string html, string? idempotencyKey = null, CancellationToken cancellationToken = default);
}
