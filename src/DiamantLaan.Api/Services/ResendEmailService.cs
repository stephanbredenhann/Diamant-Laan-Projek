using DiamantLaan.Api.Models;
using Microsoft.Extensions.Options;
using Resend;

namespace DiamantLaan.Api.Services;

public class ResendEmailService : IEmailService
{
    private readonly ResendSettings _settings;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(IOptions<ResendSettings> settings, ILogger<ResendEmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<bool> SendAsync(string to, string subject, string html, string? idempotencyKey = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey) || string.IsNullOrWhiteSpace(_settings.FromEmail))
        {
            _logger.LogWarning("Resend is not configured (ApiKey/FromEmail). Skipping email to {To}.", to);
            return false;
        }

        try
        {
            IResend resend = ResendClient.Create(_settings.ApiKey);
            var message = new EmailMessage
            {
                From = _settings.FromEmail,
                Subject = subject,
                HtmlBody = html
            };
            message.To.Add(to);

            var response = string.IsNullOrWhiteSpace(idempotencyKey)
                ? await resend.EmailSendAsync(message, cancellationToken)
                : await resend.EmailSendAsync(idempotencyKey, message, cancellationToken);

            if (!response.Success)
            {
                _logger.LogError("Resend email send failed for {To}: Success=false", to);
                return false;
            }

            return true;
        }
        catch (ResendException ex)
        {
            _logger.LogError(ex, "Resend email send failed for {To}: {ErrorType} {Message}", to, ex.ErrorType, ex.Message);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error sending email to {To}", to);
            return false;
        }
    }
}
