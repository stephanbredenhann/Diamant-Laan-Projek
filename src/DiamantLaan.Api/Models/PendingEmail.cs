namespace DiamantLaan.Api.Models;

public class PendingEmail
{
    public int Id { get; set; }
    public string To { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string HtmlBody { get; set; } = string.Empty;
    public string? IdempotencyKey { get; set; }
    public bool Sent { get; set; }
    public int AttemptCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastAttemptAt { get; set; }
    public string? LastError { get; set; }
}
