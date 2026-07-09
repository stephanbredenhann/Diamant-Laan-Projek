using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class EmailOutboxService
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly ILogger<EmailOutboxService> _logger;

    public EmailOutboxService(AppDbContext db, IEmailService email, ILogger<EmailOutboxService> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    public async Task<bool> QueueAsync(
        string to,
        string subject,
        string html,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default)
    {
        var pending = new PendingEmail
        {
            To = to,
            Subject = subject,
            HtmlBody = html,
            IdempotencyKey = idempotencyKey,
            Sent = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.PendingEmails.Add(pending);
        await _db.SaveChangesAsync(cancellationToken);

        return await TrySendAsync(pending, cancellationToken);
    }

    public async Task FlushPendingAsync(CancellationToken cancellationToken = default)
    {
        var pending = await _db.PendingEmails
            .Where(e => !e.Sent)
            .OrderBy(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

        foreach (var email in pending)
        {
            try
            {
                await TrySendAsync(email, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to flush pending email {EmailId} to {To}", email.Id, email.To);
            }
        }
    }

    private async Task<bool> TrySendAsync(PendingEmail pending, CancellationToken cancellationToken)
    {
        pending.AttemptCount++;
        pending.LastAttemptAt = DateTime.UtcNow;

        var sent = await _email.SendAsync(
            pending.To,
            pending.Subject,
            pending.HtmlBody,
            pending.IdempotencyKey,
            cancellationToken);

        if (sent)
        {
            pending.Sent = true;
            pending.LastError = null;
        }
        else
        {
            pending.LastError = "SendAsync returned false";
            _logger.LogWarning(
                "Email outbox send failed for {EmailId} to {To} (attempt {Attempt})",
                pending.Id, pending.To, pending.AttemptCount);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return sent;
    }
}
