using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class SqliteBackupBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
    private const int MaxBackups = 7;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<SqliteBackupBackgroundService> _logger;

    public SqliteBackupBackgroundService(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<SqliteBackupBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await CreateBackupAsync(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Initial SQLite backup failed");
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(Interval, stoppingToken);
                await CreateBackupAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Scheduled SQLite backup failed");
            }
        }
    }

    private async Task CreateBackupAsync(CancellationToken cancellationToken)
    {
        var connectionString = _config.GetConnectionString("DefaultConnection") ?? "Data Source=diamantlaan.db";
        var builder = new SqliteConnectionStringBuilder(connectionString);
        var dbPath = builder.DataSource;

        if (!Path.IsPathRooted(dbPath))
            dbPath = Path.Combine(AppContext.BaseDirectory, dbPath);

        if (!File.Exists(dbPath))
        {
            _logger.LogWarning("SQLite database not found at {DbPath}; skipping backup", dbPath);
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Data.AppDbContext>();
        await db.Database.ExecuteSqlRawAsync("PRAGMA wal_checkpoint(FULL);", cancellationToken);

        var backupDir = Path.Combine(Path.GetDirectoryName(dbPath)!, "backups");
        Directory.CreateDirectory(backupDir);

        var backupPath = Path.Combine(backupDir, $"diamantlaan-{DateTime.UtcNow:yyyyMMdd-HHmmss}.db");
        File.Copy(dbPath, backupPath, overwrite: true);
        _logger.LogInformation("SQLite backup created at {BackupPath}", backupPath);

        var backups = Directory.GetFiles(backupDir, "diamantlaan-*.db")
            .OrderByDescending(File.GetCreationTimeUtc)
            .Skip(MaxBackups)
            .ToList();

        foreach (var old in backups)
        {
            try
            {
                File.Delete(old);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete old SQLite backup {Path}", old);
            }
        }
    }
}
