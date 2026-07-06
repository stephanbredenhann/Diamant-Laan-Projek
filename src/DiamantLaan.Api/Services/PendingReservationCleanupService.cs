using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class PendingReservationCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PendingReservationCleanupService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5);
    private readonly TimeSpan _expiry = TimeSpan.FromMinutes(30);

    public PendingReservationCleanupService(IServiceScopeFactory scopeFactory, ILogger<PendingReservationCleanupService> logger)
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
                await Task.Delay(_checkInterval, stoppingToken);
                await ReleaseExpiredReservationsAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to release expired pending reservations");
            }
        }
    }

    private async Task ReleaseExpiredReservationsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var cutoff = DateTime.UtcNow.Subtract(_expiry);
        var expired = await db.Purchases
            .Include(p => p.PurchaseSquares)
            .Where(p => p.PaymentStatus == PaymentStatus.Pending && p.PurchaseDate < cutoff)
            .ToListAsync(cancellationToken);

        foreach (var purchase in expired)
        {
            foreach (var ps in purchase.PurchaseSquares)
            {
                var square = await db.Squares.FindAsync(new object[] { ps.SquareId }, cancellationToken);
                if (square != null && square.OwnerId == purchase.UserId)
                    square.OwnerId = null;
            }
            purchase.PaymentStatus = PaymentStatus.Cancelled;
            purchase.CancelledAt = DateTime.UtcNow;
        }

        if (expired.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Released {Count} expired pending reservations", expired.Count);
        }
    }
}
