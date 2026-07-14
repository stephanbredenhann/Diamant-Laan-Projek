namespace DiamantLaan.Api.Models;

public class AdminSaveSnapshot
{
    public int Id { get; set; }
    public string UndoBatchId { get; set; } = string.Empty;
    public string AdminUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConsumedAt { get; set; }

    /// <summary>JSON array of { squareId, previousStatus }.</summary>
    public string SquareStatusJson { get; set; } = "[]";

    public int? CreatedProgressImageId { get; set; }

    /// <summary>JSON array of { id, status, caption, filePath, squareIds } for unlinked images.</summary>
    public string ReplacedImagesJson { get; set; } = "[]";

    /// <summary>JSON array of owner user IDs queued for block emails.</summary>
    public string OwnerIdsJson { get; set; } = "[]";
}
