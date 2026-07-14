using System.Text.Json;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public record SquareStatusChange(int SquareId, int PreviousStatus);

public record ReplacedImageInfo(int Id, int Status, string? Caption, string FilePath, List<int> SquareIds);

public class UndoLastSummaryDto
{
    public int StatusChangeCount { get; set; }
    public bool HasPhoto { get; set; }
    public bool WillCancelEmails { get; set; }
}

public class UndoLastInfoDto
{
    public bool Available { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public UndoLastSummaryDto? Summary { get; set; }
}

public class AdminSaveUndoService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly AppDbContext _db;
    private readonly BlockNotificationService _blockNotifications;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AdminSaveUndoService> _logger;

    public AdminSaveUndoService(
        AppDbContext db,
        BlockNotificationService blockNotifications,
        IWebHostEnvironment env,
        ILogger<AdminSaveUndoService> logger)
    {
        _db = db;
        _blockNotifications = blockNotifications;
        _env = env;
        _logger = logger;
    }

    public async Task BeginOrReplaceAsync(
        string adminUserId,
        string? undoBatchId,
        IReadOnlyList<SquareStatusChange> statusChanges,
        IReadOnlyList<string> ownerIds,
        CancellationToken cancellationToken = default)
    {
        var batchId = string.IsNullOrWhiteSpace(undoBatchId) ? Guid.NewGuid().ToString("D") : undoBatchId.Trim();
        var open = await FindOpenSnapshotAsync(cancellationToken);

        if (open != null && string.Equals(open.UndoBatchId, batchId, StringComparison.OrdinalIgnoreCase))
        {
            open.SquareStatusJson = Serialize(statusChanges);
            open.OwnerIdsJson = Serialize(ownerIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList());
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        if (open != null)
            await DiscardSnapshotAsync(open, cancellationToken);

        _db.AdminSaveSnapshots.Add(new AdminSaveSnapshot
        {
            UndoBatchId = batchId,
            AdminUserId = adminUserId,
            CreatedAt = DateTime.UtcNow,
            SquareStatusJson = Serialize(statusChanges),
            OwnerIdsJson = Serialize(ownerIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList()),
            ReplacedImagesJson = "[]"
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task MergeImageAsync(
        string adminUserId,
        string? undoBatchId,
        int createdProgressImageId,
        IReadOnlyList<ReplacedImageInfo> replacedImages,
        CancellationToken cancellationToken = default)
    {
        var batchId = string.IsNullOrWhiteSpace(undoBatchId) ? Guid.NewGuid().ToString("D") : undoBatchId.Trim();
        var open = await FindOpenSnapshotAsync(cancellationToken);

        if (open != null && string.Equals(open.UndoBatchId, batchId, StringComparison.OrdinalIgnoreCase))
        {
            open.CreatedProgressImageId = createdProgressImageId;
            open.ReplacedImagesJson = Serialize(replacedImages);
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        if (open != null)
            await DiscardSnapshotAsync(open, cancellationToken);

        _db.AdminSaveSnapshots.Add(new AdminSaveSnapshot
        {
            UndoBatchId = batchId,
            AdminUserId = adminUserId,
            CreatedAt = DateTime.UtcNow,
            CreatedProgressImageId = createdProgressImageId,
            ReplacedImagesJson = Serialize(replacedImages),
            SquareStatusJson = "[]",
            OwnerIdsJson = "[]"
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Unlinks selected squares from images at the given status. Leaves orphan image rows + files
    /// so undo can re-link them. Returns metadata for the unlinked square associations.
    /// </summary>
    public async Task<(int ReplacedSquareCount, List<ReplacedImageInfo> Replaced)> CaptureAndUnlinkImagesAsync(
        List<int> squareIds,
        SquareStatus status,
        CancellationToken cancellationToken = default)
    {
        var links = await _db.ProgressImageSquares
            .Include(pis => pis.ProgressImage)
            .Where(pis => squareIds.Contains(pis.SquareId) && pis.ProgressImage.Status == status)
            .ToListAsync(cancellationToken);

        if (links.Count == 0)
            return (0, new List<ReplacedImageInfo>());

        var replaced = links
            .GroupBy(l => l.ProgressImageId)
            .Select(g =>
            {
                var image = g.First().ProgressImage!;
                return new ReplacedImageInfo(
                    image.Id,
                    (int)image.Status,
                    image.Caption,
                    image.FilePath,
                    g.Select(l => l.SquareId).Distinct().OrderBy(id => id).ToList());
            })
            .ToList();

        var affectedSquareIds = links.Select(l => l.SquareId).Distinct().ToList();
        _db.ProgressImageSquares.RemoveRange(links);
        await _db.SaveChangesAsync(cancellationToken);

        return (affectedSquareIds.Count, replaced);
    }

    public async Task<UndoLastInfoDto> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var open = await FindOpenSnapshotAsync(cancellationToken);
        if (open == null)
            return new UndoLastInfoDto { Available = false };

        if (IsExpired(open))
        {
            await DiscardSnapshotAsync(open, cancellationToken);
            return new UndoLastInfoDto { Available = false };
        }

        var statuses = Deserialize<List<SquareStatusChange>>(open.SquareStatusJson) ?? new();
        var owners = Deserialize<List<string>>(open.OwnerIdsJson) ?? new();
        var replaced = Deserialize<List<ReplacedImageInfo>>(open.ReplacedImagesJson) ?? new();
        var createdAtUtc = AsUtc(open.CreatedAt);

        return new UndoLastInfoDto
        {
            Available = true,
            ExpiresAt = createdAtUtc.Add(BlockNotificationService.DebounceWindow),
            Summary = new UndoLastSummaryDto
            {
                StatusChangeCount = statuses.Count,
                HasPhoto = open.CreatedProgressImageId.HasValue || replaced.Count > 0,
                WillCancelEmails = owners.Count > 0
            }
        };
    }

    public async Task<(bool Success, string? ErrorMessage)> UndoActiveAsync(CancellationToken cancellationToken = default)
    {
        var open = await FindOpenSnapshotAsync(cancellationToken);
        if (open == null)
            return (false, "Geen stoor om ongedaan te maak nie.");

        if (IsExpired(open))
        {
            await DiscardSnapshotAsync(open, cancellationToken);
            return (false, "Die tydvenster om ongedaan te maak is verstreke.");
        }

        var statuses = Deserialize<List<SquareStatusChange>>(open.SquareStatusJson) ?? new();
        var owners = Deserialize<List<string>>(open.OwnerIdsJson) ?? new();
        var replaced = Deserialize<List<ReplacedImageInfo>>(open.ReplacedImagesJson) ?? new();

        if (statuses.Count > 0)
        {
            var ids = statuses.Select(s => s.SquareId).ToList();
            var squares = await _db.Squares.Where(s => ids.Contains(s.Id)).ToListAsync(cancellationToken);
            var map = statuses.ToDictionary(s => s.SquareId, s => (SquareStatus)s.PreviousStatus);
            foreach (var square in squares)
            {
                if (map.TryGetValue(square.Id, out var previous))
                    square.Status = previous;
            }
        }

        if (open.CreatedProgressImageId is int createdId)
        {
            var created = await _db.ProgressImages
                .Include(pi => pi.ProgressImageSquares)
                .FirstOrDefaultAsync(pi => pi.Id == createdId, cancellationToken);
            if (created != null)
                await DeleteProgressImageRecordAsync(created, cancellationToken);
        }

        foreach (var info in replaced)
        {
            var imageExists = await _db.ProgressImages.AnyAsync(pi => pi.Id == info.Id, cancellationToken);
            if (!imageExists)
            {
                _logger.LogWarning("Cannot restore progress image #{ImageId}; row missing", info.Id);
                continue;
            }

            foreach (var squareId in info.SquareIds)
            {
                var alreadyLinked = await _db.ProgressImageSquares.AnyAsync(
                    pis => pis.ProgressImageId == info.Id && pis.SquareId == squareId,
                    cancellationToken);
                if (alreadyLinked) continue;

                _db.ProgressImageSquares.Add(new ProgressImageSquare
                {
                    ProgressImageId = info.Id,
                    SquareId = squareId
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        await _blockNotifications.CancelPendingAsync(owners, cancellationToken);

        open.ConsumedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return (true, null);
    }

    private async Task<AdminSaveSnapshot?> FindOpenSnapshotAsync(CancellationToken cancellationToken)
    {
        return await _db.AdminSaveSnapshots
            .Where(s => s.ConsumedAt == null)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static bool IsExpired(AdminSaveSnapshot snapshot) =>
        AsUtc(snapshot.CreatedAt) <= DateTime.UtcNow - BlockNotificationService.DebounceWindow;

    /// <summary>
    /// SQLite/EF often returns UTC timestamps as DateTimeKind.Unspecified; treat those as UTC
    /// so JSON serializes with Z and clients don't mis-parse as local time.
    /// </summary>
    private static DateTime AsUtc(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

    private async Task DiscardSnapshotAsync(AdminSaveSnapshot snapshot, CancellationToken cancellationToken)
    {
        var replaced = Deserialize<List<ReplacedImageInfo>>(snapshot.ReplacedImagesJson) ?? new();
        foreach (var info in replaced)
        {
            var hasLinks = await _db.ProgressImageSquares.AnyAsync(
                pis => pis.ProgressImageId == info.Id,
                cancellationToken);
            if (hasLinks) continue;

            var orphan = await _db.ProgressImages.FindAsync(new object[] { info.Id }, cancellationToken);
            if (orphan != null)
                await DeleteProgressImageRecordAsync(orphan, cancellationToken);
        }

        _db.AdminSaveSnapshots.Remove(snapshot);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task DeleteProgressImageRecordAsync(ProgressImage progressImage, CancellationToken cancellationToken)
    {
        var filePath = FileUploadService.ResolveProgressFilePath(_env, progressImage.FilePath);
        if (filePath != null && File.Exists(filePath))
        {
            try { File.Delete(filePath); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete progress image file {Path}", filePath);
            }
        }

        _db.ProgressImages.Remove(progressImage);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static string Serialize<T>(T value) => JsonSerializer.Serialize(value, JsonOptions);

    private static T? Deserialize<T>(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return default;
        try { return JsonSerializer.Deserialize<T>(json, JsonOptions); }
        catch { return default; }
    }
}
