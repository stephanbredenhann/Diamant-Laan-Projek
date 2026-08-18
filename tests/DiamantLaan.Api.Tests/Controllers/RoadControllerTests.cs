using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Models.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

public class RoadControllerTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static IMemoryCache NewCache() => new MemoryCache(new MemoryCacheOptions());

    private static async Task SeedSquares(AppDbContext db, IEnumerable<(int Id, string? OwnerId)> squares)
    {
        foreach (var (id, ownerId) in squares)
        {
            db.Squares.Add(new Square
            {
                Id = id,
                Status = SquareStatus.NogNieBeginNie,
                OwnerId = ownerId
            });
        }
        await db.SaveChangesAsync();
    }

    private static async Task SeedOffset(AppDbContext db, int offset)
    {
        db.SiteSettings.Add(new SiteSettings { Id = 1, KiesVirMyOffset = offset });
        await db.SaveChangesAsync();
    }

    private static List<int> PickedIds(IActionResult result)
    {
        var value = Assert.IsType<OkObjectResult>(result).Value!;
        return (List<int>)value.GetType().GetProperty("squareIds")!.GetValue(value)!;
    }

    private static List<SquareDto> SquaresFrom(IActionResult result) =>
        (List<SquareDto>)Assert.IsType<OkObjectResult>(result).Value!;

    [Fact]
    public async Task GetSquares_ReflectsCurrentOwnershipOnAColdCache()
    {
        await using var db = CreateDb();
        await SeedSquares(db, new[] { (1, (string?)null), (2, "owner-1") });

        var result = await new RoadController(db, NewCache()).GetSquares();

        var squares = SquaresFrom(result);
        Assert.False(squares.Single(s => s.Id == 1).IsSold);
        Assert.True(squares.Single(s => s.Id == 2).IsSold);
    }

    /// <summary>
    /// The grid is served from a short-lived cache, so a block sold seconds ago can still draw as
    /// available. That is deliberate and safe because nothing is sold off this response: the reserve
    /// path in PurchaseController re-reads ownership from the database. This test pins the behaviour
    /// so nobody "fixes" it by wiring in invalidation from the nine square-mutating call sites.
    /// </summary>
    [Fact]
    public async Task GetSquares_ServesTheCachedGridWhileTheEntryIsLive()
    {
        await using var db = CreateDb();
        await SeedSquares(db, new[] { (1, (string?)null) });
        var cache = NewCache();

        var first = SquaresFrom(await new RoadController(db, cache).GetSquares());
        Assert.False(first.Single(s => s.Id == 1).IsSold);

        db.Squares.Single(s => s.Id == 1).OwnerId = "owner-1";
        await db.SaveChangesAsync();

        var cached = SquaresFrom(await new RoadController(db, cache).GetSquares());
        Assert.False(cached.Single(s => s.Id == 1).IsSold);

        // ...and the moment the entry goes, the truth comes back.
        cache.Remove(RoadController.SquaresCacheKey);
        var fresh = SquaresFrom(await new RoadController(db, cache).GetSquares());
        Assert.True(fresh.Single(s => s.Id == 1).IsSold);
    }

    [Fact]
    public async Task PickSquares_ReturnsFirstNAvailableFromBlockOneUpward()
    {
        await using var db = CreateDb();
        await SeedSquares(db, Enumerable.Range(1, 8).Select(id => (id, (string?)null)));
        var controller = new RoadController(db, NewCache());

        var result = await controller.PickSquares(3);

        var ok = Assert.IsType<OkObjectResult>(result);
        var value = ok.Value!;
        var squareIds = (List<int>)value.GetType().GetProperty("squareIds")!.GetValue(value)!;
        Assert.Equal(new[] { 1, 2, 3 }, squareIds);
    }

    [Fact]
    public async Task PickSquares_SkipsSoldBlocks()
    {
        await using var db = CreateDb();
        await SeedSquares(db, new[]
        {
            (200, (string?)null),
            (201, "owner-1"),
            (202, (string?)null),
            (203, (string?)null),
        });
        var controller = new RoadController(db, NewCache());

        var result = await controller.PickSquares(2);

        var ok = Assert.IsType<OkObjectResult>(result);
        var value = ok.Value!;
        var squareIds = (List<int>)value.GetType().GetProperty("squareIds")!.GetValue(value)!;
        Assert.Equal(new[] { 200, 202 }, squareIds);
    }

    [Fact]
    public async Task PickSquares_RejectsCountOver4000()
    {
        await using var db = CreateDb();
        var controller = new RoadController(db, NewCache());

        var result = await controller.PickSquares(4001);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var message = badRequest.Value!.GetType().GetProperty("message")!.GetValue(badRequest.Value)!.ToString();
        Assert.Equal("Maksimum 4000 blokke kan gekies word.", message);
    }

    [Fact]
    public async Task PickSquares_ReturnsErrorWhenNotEnoughAvailable()
    {
        await using var db = CreateDb();
        await SeedSquares(db, new[] { (200, (string?)null), (201, (string?)null) });
        var controller = new RoadController(db, NewCache());

        var result = await controller.PickSquares(5);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var message = badRequest.Value!.GetType().GetProperty("message")!.GetValue(badRequest.Value)!.ToString();
        Assert.Equal("Nie genoeg beskikbare blokke nie.", message);
    }

    [Fact]
    public async Task PickSquares_RejectsCountBelowOne()
    {
        await using var db = CreateDb();
        var controller = new RoadController(db, NewCache());

        var result = await controller.PickSquares(0);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var message = badRequest.Value!.GetType().GetProperty("message")!.GetValue(badRequest.Value)!.ToString();
        Assert.Equal("Ongeldige aantal blokke.", message);
    }

    /// <summary>
    /// The admin offset steers new auto-assignments into a higher part of the road. It is
    /// inclusive: an offset of 5 makes block 5 itself the first one handed out.
    /// </summary>
    [Fact]
    public async Task PickSquares_PrefersBlocksAtOrAboveTheOffset()
    {
        await using var db = CreateDb();
        await SeedSquares(db, Enumerable.Range(1, 10).Select(id => (id, (string?)null)));
        await SeedOffset(db, 5);

        var result = await new RoadController(db, NewCache()).PickSquares(3);

        Assert.Equal(new[] { 5, 6, 7 }, PickedIds(result));
    }

    /// <summary>
    /// The offset is a preference, not a filter. Once the range above it runs short the batch
    /// tops up from the lowest blocks below, rather than failing with blocks still available.
    /// </summary>
    [Fact]
    public async Task PickSquares_TopsUpFromBelowWhenTheHighRangeRunsShort()
    {
        await using var db = CreateDb();
        await SeedSquares(db, new[]
        {
            (1, (string?)null),
            (2, (string?)null),
            (3, (string?)null),
            (5, (string?)null),
            (6, (string?)null),
        });
        await SeedOffset(db, 5);

        var result = await new RoadController(db, NewCache()).PickSquares(4);

        Assert.Equal(new[] { 5, 6, 1, 2 }, PickedIds(result));
    }

    [Fact]
    public async Task PickSquares_WithZeroOffsetIsUnchanged()
    {
        await using var db = CreateDb();
        await SeedSquares(db, Enumerable.Range(1, 10).Select(id => (id, (string?)null)));
        await SeedOffset(db, 0);

        var result = await new RoadController(db, NewCache()).PickSquares(3);

        Assert.Equal(new[] { 1, 2, 3 }, PickedIds(result));
    }

    /// <summary>
    /// Every other test here runs on the in-memory provider, which is LINQ-to-objects and would
    /// happily "pass" an ORDER BY that SQLite cannot translate. This one runs the real migration
    /// chain against real SQLite, so it fails if the offset ordering stops being valid SQL.
    /// </summary>
    [Fact]
    public async Task PickSquares_OffsetOrderingTranslatesOnSqlite()
    {
        using var conn = new SqliteConnection("DataSource=:memory:");
        conn.Open();
        await using var db = new AppDbContext(
            new DbContextOptionsBuilder<AppDbContext>().UseSqlite(conn).Options);
        await db.Database.MigrateAsync();

        foreach (var id in Enumerable.Range(1, 10))
            db.Squares.Add(new Square { Id = id });
        db.SiteSettings.Single().KiesVirMyOffset = 5;
        await db.SaveChangesAsync();

        var result = await new RoadController(db, NewCache()).PickSquares(4);

        Assert.Equal(new[] { 5, 6, 7, 8 }, PickedIds(result));
    }
}
