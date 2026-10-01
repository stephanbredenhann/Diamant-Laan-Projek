using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

/// <summary>The public photo follows the gallery: hidden builder or switched-off feature means no photo.</summary>
public class StadsbouerPhotoTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly string _root = Path.Combine(Path.GetTempPath(), $"stadsbouer-foto-{Guid.NewGuid():N}");
    private readonly IWebHostEnvironment _env;

    public StadsbouerPhotoTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        _db.Database.Migrate();

        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(_root);
        _env = env.Object;
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        if (Directory.Exists(_root))
            Directory.Delete(_root, true);
        GC.SuppressFinalize(this);
    }

    [Theory]
    [InlineData(true, true, true)]
    [InlineData(false, true, false)]
    [InlineData(true, false, false)]
    public async Task GetPhoto_OnlyForActiveBuildersWhileEnabled(bool isActive, bool enabled, bool served)
    {
        var builder = new Stadsbouer { Name = "Kobus Nel", IsActive = isActive };
        _db.Stadsbouers.Add(builder);
        _db.SaveChanges();
        await File.WriteAllBytesAsync(Path.Combine(FileUploadService.GetStadsbouerUploadsPath(_env), $"{builder.Id}.jpg"), new byte[] { 0xFF, 0xD8, 0xFF });
        builder.PhotoPath = $"stadsbouers/{builder.Id}.jpg";
        _db.SaveChanges();

        var settings = new SiteSettingsService(_db);
        await settings.SetStadsbouersEnabledAsync(enabled);

        var result = await new StadsbouersController(_db, settings, _env).GetPhoto(builder.Id, CancellationToken.None);

        if (served)
            Assert.IsType<PhysicalFileResult>(result);
        else
            Assert.IsType<NotFoundResult>(result);
    }
}
