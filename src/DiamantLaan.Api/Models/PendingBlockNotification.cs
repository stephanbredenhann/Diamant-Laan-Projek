using System.ComponentModel.DataAnnotations;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

public class PendingBlockNotification
{
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public DateTime FirstQueuedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastQueuedAt { get; set; } = DateTime.UtcNow;
    public bool Sent { get; set; }

    /// <summary>
    /// The <see cref="Enums.SquareStatus"/> values this owner's blocks moved into while the row was
    /// armed, comma separated. One email goes out per status, so a single admin save that moves two
    /// batches of the same owner's blocks produces two emails.
    /// </summary>
    [MaxLength(50)]
    public string Statuses { get; set; } = string.Empty;

    public IEnumerable<SquareStatus> ParsedStatuses() =>
        Statuses.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => int.TryParse(s, out var v) ? (SquareStatus?)v : null)
            .Where(s => s.HasValue)
            .Select(s => s!.Value)
            .Distinct();

    public void AddStatus(SquareStatus status) =>
        Statuses = string.Join(',', ParsedStatuses().Append(status).Distinct().Select(s => (int)s));
}
