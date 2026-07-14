using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class AdminSaveUndoServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static IWebHostEnvironment CreateEnv(string contentRoot)
    {
        Directory.CreateDirectory(Path.Combine(contentRoot, "App_Data", "uploads", "progress"));
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(contentRoot);
        env.Setup(e => e.WebRootPath).Returns(Path.Combine(contentRoot, "wwwroot"));
        env.Setup(e => e.ContentRootFileProvider).Returns(new PhysicalFileProvider(contentRoot));
        return env.Object;
    }

    private static (AdminSaveUndoService Undo, BlockNotificationService Notifications, AppDbContext Db, string ContentRoot) CreateServices()
    {
        var db = CreateDb();
        var contentRoot = Path.Combine(Path.GetTempPath(), "dl-undo-tests-" + Guid.NewGuid().ToString("N"));
        var env = CreateEnv(contentRoot);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["App:PublicUrl"] = "http://localhost:4200" })
            .Build();
        var email = new Mock<IEmailService>();
        var notifications = new BlockNotificationService(db, email.Object, config, NullLogger<BlockNotificationService>.Instance);
        var undo = new AdminSaveUndoService(db, notifications, env, NullLogger<AdminSaveUndoService>.Instance);
        return (undo, notifications, db, contentRoot);
    }

    [Fact]
    public async Task StatusSave_CreatesSnapshot_UndoRestoresStatusAndCancelsPending()
    {
        var (undo, notifications, db, root) = CreateServices();
        await using var _ = db;
        try
        {
            db.Squares.Add(new Square { Id = 1, OwnerId = "u1", Status = SquareStatus.NogNieBeginNie });
            await db.SaveChangesAsync();

            db.Squares.First().Status = SquareStatus.Voorberei;
            await db.SaveChangesAsync();
            await notifications.QueueOwnersAsync(new[] { "u1" });
            await undo.BeginOrReplaceAsync(
                "admin1",
                "batch-1",
                new[] { new SquareStatusChange(1, (int)SquareStatus.NogNieBeginNie) },
                new[] { "u1" });

            var info = await undo.GetActiveAsync();
            Assert.True(info.Available);
            Assert.Equal(1, info.Summary!.StatusChangeCount);
            Assert.True(info.Summary.WillCancelEmails);

            var (ok, err) = await undo.UndoActiveAsync();
            Assert.True(ok, err);
            Assert.Equal(SquareStatus.NogNieBeginNie, (await db.Squares.SingleAsync()).Status);
            Assert.Empty(await db.PendingBlockNotifications.ToListAsync());
            Assert.False((await undo.GetActiveAsync()).Available);
        }
        finally
        {
            try { Directory.Delete(root, true); } catch { /* ignore */ }
        }
    }

    [Fact]
    public async Task StatusThenImage_SameBatch_Merges_UndoRestoresBoth()
    {
        var (undo, notifications, db, root) = CreateServices();
        await using var _ = db;
        try
        {
            db.Users.Add(new User
            {
                Id = "admin1",
                UserName = "a@b.com",
                Email = "a@b.com",
                NormalizedEmail = "A@B.COM",
                NormalizedUserName = "A@B.COM"
            });
            db.Squares.Add(new Square { Id = 1, OwnerId = "u1", Status = SquareStatus.Voorberei });
            await db.SaveChangesAsync();

            await undo.BeginOrReplaceAsync(
                "admin1",
                "batch-2",
                new[] { new SquareStatusChange(1, (int)SquareStatus.NogNieBeginNie) },
                new[] { "u1" });
            await notifications.QueueOwnersAsync(new[] { "u1" });

            var image = new ProgressImage
            {
                Status = SquareStatus.Voorberei,
                FilePath = "progress/99.jpg",
                UploadedByUserId = "admin1"
            };
            image.ProgressImageSquares.Add(new ProgressImageSquare { SquareId = 1 });
            db.ProgressImages.Add(image);
            await db.SaveChangesAsync();

            var filePath = Path.Combine(root, "App_Data", "uploads", "progress", $"{image.Id}.jpg");
            await File.WriteAllBytesAsync(filePath, new byte[] { 0xFF, 0xD8, 0xFF });
            image.FilePath = $"progress/{image.Id}.jpg";
            await db.SaveChangesAsync();

            await undo.MergeImageAsync("admin1", "batch-2", image.Id, Array.Empty<ReplacedImageInfo>());

            var info = await undo.GetActiveAsync();
            Assert.True(info.Available);
            Assert.True(info.Summary!.HasPhoto);

            var (ok, err) = await undo.UndoActiveAsync();
            Assert.True(ok, err);
            Assert.Equal(SquareStatus.NogNieBeginNie, (await db.Squares.SingleAsync()).Status);
            Assert.Empty(await db.ProgressImages.ToListAsync());
            Assert.False(File.Exists(filePath));
        }
        finally
        {
            try { Directory.Delete(root, true); } catch { /* ignore */ }
        }
    }

    [Fact]
    public async Task ReplaceExisting_KeepsOrphan_UndoRelinks()
    {
        var (undo, _, db, root) = CreateServices();
        await using var _ = db;
        try
        {
            db.Users.Add(new User
            {
                Id = "admin1",
                UserName = "a@b.com",
                Email = "a@b.com",
                NormalizedEmail = "A@B.COM",
                NormalizedUserName = "A@B.COM"
            });
            db.Squares.Add(new Square { Id = 1, Status = SquareStatus.Voorberei });
            var oldImage = new ProgressImage
            {
                Status = SquareStatus.Voorberei,
                FilePath = "progress/old.jpg",
                Caption = "Ou foto",
                UploadedByUserId = "admin1"
            };
            oldImage.ProgressImageSquares.Add(new ProgressImageSquare { SquareId = 1 });
            db.ProgressImages.Add(oldImage);
            await db.SaveChangesAsync();

            var oldFile = Path.Combine(root, "App_Data", "uploads", "progress", $"{oldImage.Id}.jpg");
            await File.WriteAllBytesAsync(oldFile, new byte[] { 0xFF, 0xD8, 0xFF });
            oldImage.FilePath = $"progress/{oldImage.Id}.jpg";
            await db.SaveChangesAsync();

            var (count, replaced) = await undo.CaptureAndUnlinkImagesAsync(
                new List<int> { 1 }, SquareStatus.Voorberei);
            Assert.Equal(1, count);
            Assert.Single(replaced);
            Assert.Empty(await db.ProgressImageSquares.ToListAsync());
            Assert.True(File.Exists(oldFile));

            var newImage = new ProgressImage
            {
                Status = SquareStatus.Voorberei,
                FilePath = "",
                UploadedByUserId = "admin1"
            };
            newImage.ProgressImageSquares.Add(new ProgressImageSquare { SquareId = 1 });
            db.ProgressImages.Add(newImage);
            await db.SaveChangesAsync();
            var newFile = Path.Combine(root, "App_Data", "uploads", "progress", $"{newImage.Id}.jpg");
            await File.WriteAllBytesAsync(newFile, new byte[] { 0xFF, 0xD8, 0xFF });
            newImage.FilePath = $"progress/{newImage.Id}.jpg";
            await db.SaveChangesAsync();

            await undo.MergeImageAsync("admin1", "batch-3", newImage.Id, replaced);

            var (ok, err) = await undo.UndoActiveAsync();
            Assert.True(ok, err);
            Assert.Null(await db.ProgressImages.FirstOrDefaultAsync(pi => pi.Id == newImage.Id));
            var restored = await db.ProgressImages.Include(pi => pi.ProgressImageSquares)
                .SingleAsync(pi => pi.Id == oldImage.Id);
            Assert.Single(restored.ProgressImageSquares);
            Assert.Equal(1, restored.ProgressImageSquares.First().SquareId);
            Assert.True(File.Exists(oldFile));
        }
        finally
        {
            try { Directory.Delete(root, true); } catch { /* ignore */ }
        }
    }

    [Fact]
    public async Task ExpiredSnapshot_GetReturnsUnavailable_UndoFails()
    {
        var (undo, _, db, root) = CreateServices();
        await using var _ = db;
        try
        {
            db.AdminSaveSnapshots.Add(new AdminSaveSnapshot
            {
                UndoBatchId = "old",
                AdminUserId = "admin1",
                CreatedAt = DateTime.UtcNow - BlockNotificationService.DebounceWindow - TimeSpan.FromMinutes(1),
                SquareStatusJson = "[]",
                OwnerIdsJson = "[]",
                ReplacedImagesJson = "[]"
            });
            await db.SaveChangesAsync();

            Assert.False((await undo.GetActiveAsync()).Available);
            Assert.Empty(await db.AdminSaveSnapshots.ToListAsync());

            db.AdminSaveSnapshots.Add(new AdminSaveSnapshot
            {
                UndoBatchId = "old2",
                AdminUserId = "admin1",
                CreatedAt = DateTime.UtcNow - BlockNotificationService.DebounceWindow - TimeSpan.FromMinutes(1),
                SquareStatusJson = "[]",
                OwnerIdsJson = "[]",
                ReplacedImagesJson = "[]"
            });
            await db.SaveChangesAsync();

            var (ok, err) = await undo.UndoActiveAsync();
            Assert.False(ok);
            Assert.Contains("verstreke", err);
        }
        finally
        {
            try { Directory.Delete(root, true); } catch { /* ignore */ }
        }
    }

    [Fact]
    public async Task NewSave_ReplacesPreviousOpenSnapshot()
    {
        var (undo, _, db, root) = CreateServices();
        await using var _ = db;
        try
        {
            db.Squares.AddRange(
                new Square { Id = 1, Status = SquareStatus.Voorberei },
                new Square { Id = 2, Status = SquareStatus.Voorberei });
            await db.SaveChangesAsync();

            await undo.BeginOrReplaceAsync(
                "admin1",
                "batch-a",
                new[] { new SquareStatusChange(1, 0) },
                Array.Empty<string>());
            await undo.BeginOrReplaceAsync(
                "admin1",
                "batch-b",
                new[] { new SquareStatusChange(2, 0) },
                Array.Empty<string>());

            Assert.Single(await db.AdminSaveSnapshots.Where(s => s.ConsumedAt == null).ToListAsync());
            var open = await db.AdminSaveSnapshots.SingleAsync(s => s.ConsumedAt == null);
            Assert.Equal("batch-b", open.UndoBatchId);
            Assert.Contains("\"squareId\":2", open.SquareStatusJson);
        }
        finally
        {
            try { Directory.Delete(root, true); } catch { /* ignore */ }
        }
    }
}
