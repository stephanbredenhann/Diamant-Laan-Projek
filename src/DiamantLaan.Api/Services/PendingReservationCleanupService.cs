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
        try
        {
            await ReleaseExpiredReservationsAsync(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Initial pending reservation cleanup failed");
        }

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

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var cutoff = DateTime.UtcNow.Subtract(_expiry);
            // Guest reservations cost nothing to create, so they are released sooner.
            var guestCutoff = DateTime.UtcNow.Subtract(GuestPurchaseService.ReservationExpiry);
            var expired = await db.Purchases
                .Include(p => p.PurchaseSquares)
                .Where(p => p.PaymentStatus == PaymentStatus.Pending
                            && (p.GuestTokenHash == null ? p.PurchaseDate < cutoff : p.PurchaseDate < guestCutoff))
                .ToListAsync(cancellationToken);

            if (expired.Count == 0)
            {
                await transaction.CommitAsync(cancellationToken);
                return;
            }

            var squareIds = expired
                .SelectMany(p => p.PurchaseSquares)
                .Select(ps => ps.SquareId)
                .Distinct()
                .ToList();

            var squares = await db.Squares
                .Where(s => squareIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, cancellationToken);

            foreach (var purchase in expired)
            {
                foreach (var ps in purchase.PurchaseSquares)
                {
                    if (squares.TryGetValue(ps.SquareId, out var square) && square.OwnerId == purchase.UserId)
                        square.OwnerId = null;
                }
                purchase.PaymentStatus = PaymentStatus.Cancelled;
                purchase.CancelledAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            _logger.LogInformation("Released {Count} expired pending reservations", expired.Count);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        await RemoveOrphanedGuestUsersAsync(db, cancellationToken);
    }

    /// <summary>
    /// Deletes the placeholder accounts left behind by guest checkouts that never completed.
    /// Only accounts that had a purchase and whose every purchase was cancelled qualify, because a guest
    /// user with no purchase yet may simply be mid-checkout.
    /// Their cancelled purchase rows cascade away with them.
    /// </summary>
    private async Task RemoveOrphanedGuestUsersAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        try
        {
            var orphans = await db.Users
                .Where(u => u.IsGuest
                            && !db.Squares.Any(s => s.OwnerId == u.Id)
                            && db.Purchases.Any(p => p.UserId == u.Id)
                            && !db.Purchases.Any(p => p.UserId == u.Id && p.PaymentStatus != PaymentStatus.Cancelled))
                .ToListAsync(cancellationToken);

            if (orphans.Count == 0)
                return;

            db.Users.RemoveRange(orphans);
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Removed {Count} orphaned guest users", orphans.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove orphaned guest users");
        }
    }
}
