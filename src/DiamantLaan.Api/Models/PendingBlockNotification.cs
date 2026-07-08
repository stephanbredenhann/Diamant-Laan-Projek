namespace DiamantLaan.Api.Models;

public class PendingBlockNotification
{
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public DateTime FirstQueuedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastQueuedAt { get; set; } = DateTime.UtcNow;
    public bool Sent { get; set; }
}
