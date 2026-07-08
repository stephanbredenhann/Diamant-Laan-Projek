using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    [Fact]
    public async Task PickSquares_ReturnsFirstNAvailableFrom200Upward()
    {
        await using var db = CreateDb();
        await SeedSquares(db, Enumerable.Range(198, 8).Select(id => (id, (string?)null)));
        var controller = new RoadController(db);

        var result = await controller.PickSquares(3);

        var ok = Assert.IsType<OkObjectResult>(result);
        var value = ok.Value!;
        var squareIds = (List<int>)value.GetType().GetProperty("squareIds")!.GetValue(value)!;
        Assert.Equal(new[] { 200, 201, 202 }, squareIds);
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
        var controller = new RoadController(db);

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
        var controller = new RoadController(db);

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
        var controller = new RoadController(db);

        var result = await controller.PickSquares(5);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var message = badRequest.Value!.GetType().GetProperty("message")!.GetValue(badRequest.Value)!.ToString();
        Assert.Equal("Nie genoeg beskikbare blokke nie.", message);
    }

    [Fact]
    public async Task PickSquares_RejectsCountBelowOne()
    {
        await using var db = CreateDb();
        var controller = new RoadController(db);

        var result = await controller.PickSquares(0);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var message = badRequest.Value!.GetType().GetProperty("message")!.GetValue(badRequest.Value)!.ToString();
        Assert.Equal("Ongeldige aantal blokke.", message);
    }
}
