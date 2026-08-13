using DiamantLaan.Api.Models;
using Microsoft.Extensions.Options;

namespace DiamantLaan.Api.Services;

public class EmailHealthService
{
    private readonly MandrillSettings _settings;

    public EmailHealthService(IOptions<MandrillSettings> settings) => _settings = settings.Value;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_settings.ApiKey)
        && !string.IsNullOrWhiteSpace(_settings.FromEmail);
}
