using DiamantLaan.Api.Models;
using Microsoft.Extensions.Options;

namespace DiamantLaan.Api.Services;

public class EmailHealthService
{
    private readonly ResendSettings _settings;

    public EmailHealthService(IOptions<ResendSettings> settings) => _settings = settings.Value;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_settings.ApiKey)
        && !string.IsNullOrWhiteSpace(_settings.FromEmail);
}
