using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class BlockNotificationService
{
    public static readonly TimeSpan DebounceWindow = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly IConfiguration _config;
    private readonly ILogger<BlockNotificationService> _logger;

    public BlockNotificationService(
        AppDbContext db,
        IEmailService email,
        IConfiguration config,
        ILogger<BlockNotificationService> logger)
    {
        _db = db;
        _email = email;
        _config = config;
        _logger = logger;
    }

    public async Task QueueOwnersAsync(IEnumerable<string?> ownerIds, CancellationToken cancellationToken = default)
    {
        var ids = ownerIds.Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id!).Distinct().ToList();
        if (ids.Count == 0) return;

        var now = DateTime.UtcNow;
        var existing = await _db.PendingBlockNotifications
            .Where(p => ids.Contains(p.UserId))
            .ToListAsync(cancellationToken);
        var existingMap = existing.ToDictionary(p => p.UserId);

        foreach (var userId in ids)
        {
            if (existingMap.TryGetValue(userId, out var pending))
            {
                if (pending.Sent)
                    pending.FirstQueuedAt = now;
                pending.LastQueuedAt = now;
                pending.Sent = false;
            }
            else
            {
                _db.PendingBlockNotifications.Add(new PendingBlockNotification
                {
                    UserId = userId,
                    FirstQueuedAt = now,
                    LastQueuedAt = now,
                    Sent = false
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task FlushDueAsync(CancellationToken cancellationToken = default, bool forceAll = false)
    {
        var cutoff = DateTime.UtcNow - DebounceWindow;
        var query = _db.PendingBlockNotifications.Where(p => !p.Sent);
        if (!forceAll)
            query = query.Where(p => p.LastQueuedAt <= cutoff);

        var due = await query.ToListAsync(cancellationToken);
        foreach (var pending in due)
        {
            try
            {
                await SendForUserAsync(pending, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send block progress email for user {UserId}", pending.UserId);
            }
        }
    }

    private async Task SendForUserAsync(PendingBlockNotification pending, CancellationToken cancellationToken)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == pending.UserId, cancellationToken);
        if (user == null || user.IsAnonymized || string.IsNullOrWhiteSpace(user.Email) || !user.ReceiveBlockProgressEmails)
        {
            pending.Sent = true;
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        var squares = await _db.Squares
            .Where(s => s.OwnerId == user.Id)
            .Select(s => new { s.Id, s.Status })
            .ToListAsync(cancellationToken);

        if (squares.Count == 0)
        {
            pending.Sent = true;
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        var statusCounts = squares
            .GroupBy(s => s.Status)
            .ToDictionary(g => SquareStatusLabels.Get(g.Key), g => g.Count());

        var squareIds = squares.Select(s => s.Id).ToList();
        var hasPhotos = await _db.ProgressImageSquares
            .AnyAsync(pis => squareIds.Contains(pis.SquareId), cancellationToken);

        var siteUrl = AppPublicUrl.Resolve(_config);
        var html = EmailTemplates.BlockProgressSummary(
            user.FirstName,
            squares.Count,
            statusCounts,
            hasPhotos,
            siteUrl);

        var sent = await _email.SendAsync(
            user.Email,
            "Opdatering op jou blokke — Diamant Laan",
            html,
            idempotencyKey: null,
            cancellationToken);

        if (sent)
        {
            pending.Sent = true;
            await _db.SaveChangesAsync(cancellationToken);
        }
    }
}
