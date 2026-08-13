using System.Net.Http.Json;
using System.Text.Json.Serialization;
using DiamantLaan.Api.Models;
using Microsoft.Extensions.Options;

namespace DiamantLaan.Api.Services;

/// <summary>Mailchimp Transactional (Mandrill) sender. One JSON POST, so no SDK.</summary>
public class MandrillEmailService : IEmailService
{
    private const string SendUrl = "https://mandrillapp.com/api/1.0/messages/send.json";

    private readonly HttpClient _http;
    private readonly MandrillSettings _settings;
    private readonly ILogger<MandrillEmailService> _logger;

    public MandrillEmailService(HttpClient http, IOptions<MandrillSettings> settings, ILogger<MandrillEmailService> logger)
    {
        _http = http;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<bool> SendAsync(string to, string subject, string html, string? idempotencyKey = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey) || string.IsNullOrWhiteSpace(_settings.FromEmail))
        {
            _logger.LogWarning("Mandrill is not configured (ApiKey/FromEmail). Skipping email to {To}.", to);
            return false;
        }

        try
        {
            var request = new SendRequest(
                _settings.ApiKey,
                new SendMessage(_settings.FromEmail, subject, html, [new Recipient(to, "to")]));

            var response = await _http.PostAsJsonAsync(SendUrl, request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Mandrill email send failed for {To}: {Status} {Body}", to, (int)response.StatusCode, body);
                return false;
            }

            var results = await response.Content.ReadFromJsonAsync<SendResult[]>(cancellationToken);
            var result = results?.FirstOrDefault();
            if (result is null || (result.Status != "sent" && result.Status != "queued" && result.Status != "scheduled"))
            {
                _logger.LogError("Mandrill email rejected for {To}: status={Status} reason={Reason}", to, result?.Status, result?.RejectReason);
                return false;
            }

            _logger.LogInformation("Mandrill email {Status} to {To}, messageId={MessageId}", result.Status, to, result.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error sending email to {To}", to);
            return false;
        }
    }

    // Mandrill has no idempotency key, so the interface's key is ignored.
    private record SendRequest([property: JsonPropertyName("key")] string Key, [property: JsonPropertyName("message")] SendMessage Message);

    private record SendMessage(
        [property: JsonPropertyName("from_email")] string FromEmail,
        [property: JsonPropertyName("subject")] string Subject,
        [property: JsonPropertyName("html")] string Html,
        [property: JsonPropertyName("to")] Recipient[] To);

    private record Recipient([property: JsonPropertyName("email")] string Email, [property: JsonPropertyName("type")] string Type);

    private record SendResult(
        [property: JsonPropertyName("_id")] string? Id,
        [property: JsonPropertyName("status")] string? Status,
        [property: JsonPropertyName("reject_reason")] string? RejectReason);
}
