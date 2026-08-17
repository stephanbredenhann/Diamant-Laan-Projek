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

    public async Task QueueOwnersAsync(
        IEnumerable<string?> ownerIds,
        SquareStatus status,
        CancellationToken cancellationToken = default)
    {
        var ids = ownerIds.Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id!).Distinct().ToList();
        if (ids.Count == 0) return;

        var now = DateTime.UtcNow;
        // UserId is the PK — must load Sent rows too so we re-arm instead of inserting duplicates.
        var existing = await _db.PendingBlockNotifications
            .Where(p => ids.Contains(p.UserId))
            .ToListAsync(cancellationToken);
        var existingMap = existing.ToDictionary(p => p.UserId);

        foreach (var userId in ids)
        {
            if (existingMap.TryGetValue(userId, out var pending))
            {
                if (pending.Sent)
                {
                    pending.FirstQueuedAt = now;
                    // A sent row's statuses were already emailed about; start the set over.
                    pending.Statuses = string.Empty;
                }
                pending.LastQueuedAt = now;
                pending.Sent = false;
                pending.AddStatus(status);
            }
            else
            {
                var row = new PendingBlockNotification
                {
                    UserId = userId,
                    FirstQueuedAt = now,
                    LastQueuedAt = now,
                    Sent = false
                };
                row.AddStatus(status);
                _db.PendingBlockNotifications.Add(row);
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task CancelPendingAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default)
    {
        var ids = userIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0) return;

        var pending = await _db.PendingBlockNotifications
            .Where(p => !p.Sent && ids.Contains(p.UserId))
            .ToListAsync(cancellationToken);

        if (pending.Count == 0) return;

        _db.PendingBlockNotifications.RemoveRange(pending);
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

        var statuses = pending.ParsedStatuses().OrderBy(s => (int)s).ToList();
        if (statuses.Count == 0)
        {
            pending.Sent = true;
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        var squares = await _db.Squares
            .Where(s => s.OwnerId == user.Id && statuses.Contains(s.Status))
            .Select(s => new { s.Id, s.Status })
            .ToListAsync(cancellationToken);

        if (squares.Count == 0)
        {
            pending.Sent = true;
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        var siteUrl = AppPublicUrl.Resolve(_config);
        var allSent = true;

        foreach (var status in statuses)
        {
            var blockIds = squares.Where(s => s.Status == status).Select(s => s.Id).ToList();
            var mail = EmailTemplates.BlockStatusUpdate(user.FirstName, status, blockIds, siteUrl);
            if (mail == null) continue;

            var sent = await _email.SendAsync(
                user.Email,
                mail.Value.Subject,
                mail.Value.Html,
                idempotencyKey: null,
                cancellationToken);

            if (!sent) allSent = false;
        }

        // Marking the row sent only when every status went out means a partial failure retries the
        // whole batch. Duplicates are the lesser evil against a silently dropped update.
        if (allSent)
        {
            pending.Sent = true;
            await _db.SaveChangesAsync(cancellationToken);
        }
    }
}
