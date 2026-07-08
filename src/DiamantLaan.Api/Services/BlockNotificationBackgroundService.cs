namespace DiamantLaan.Api.Services;

public class BlockNotificationBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(2);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BlockNotificationBackgroundService> _logger;

    public BlockNotificationBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<BlockNotificationBackgroundService> logger)
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
                var service = scope.ServiceProvider.GetRequiredService<BlockNotificationService>();
                await service.FlushDueAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Block notification background flush failed");
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
            var service = scope.ServiceProvider.GetRequiredService<BlockNotificationService>();
            await service.FlushDueAsync(cancellationToken, forceAll: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to flush pending block notifications on shutdown");
        }

        await base.StopAsync(cancellationToken);
    }
}
