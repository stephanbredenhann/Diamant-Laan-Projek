namespace DiamantLaan.Api.Models;

public class AdminAuditLog
{
    public int Id { get; set; }
    public string AdminUserId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
