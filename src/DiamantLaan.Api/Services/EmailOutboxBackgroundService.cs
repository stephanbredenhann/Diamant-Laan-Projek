namespace DiamantLaan.Api.Services;

public class EmailOutboxBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(2);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailOutboxBackgroundService> _logger;

    public EmailOutboxBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<EmailOutboxBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var outbox = scope.ServiceProvider.GetRequiredService<EmailOutboxService>();
                await outbox.FlushPendingAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Email outbox background flush failed");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var outbox = scope.ServiceProvider.GetRequiredService<EmailOutboxService>();
            await outbox.FlushPendingAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to flush pending emails on shutdown");
        }

        await base.StopAsync(cancellationToken);
    }
}
