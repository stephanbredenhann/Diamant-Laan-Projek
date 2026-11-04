using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

/// <summary>
/// Which purchases came in before the fund's first million. The threshold is passed in small, so
/// each case reads in a handful of blocks rather than two thousand.
/// </summary>
public class PioneerBlocksTests
{
    private static readonly DateTime Day = new(2026, 3, 1, 9, 0, 0, DateTimeKind.Utc);

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static Purchase Purchase(
        int id, int[] squares, DateTime purchased, DateTime? confirmed = null,
        PaymentStatus status = PaymentStatus.Confirmed)
    {
        var purchase = new Purchase
        {
            Id = id,
            UserId = "u",
            Amount = squares.Length * 500m,
            PaymentStatus = status,
            PurchaseDate = purchased,
            ConfirmedAt = confirmed,
        };
        foreach (var square in squares)
            purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = square });
        return purchase;
    }

    [Fact]
    public void Threshold_IsAMillionRandOfBlocks()
    {
        Assert.Equal(2000, PioneerBlocks.PioneerBlockCount);
    }

    [Fact]
    public async Task CountsThePurchaseThatCrossesTheLineInFull_AndNothingAfterIt()
    {
        await using var db = CreateDb();
        db.Purchases.AddRange(
            Purchase(1, [1, 2], Day),
            Purchase(2, [3, 4, 5], Day.AddDays(1)),   // 2 before it, so it qualifies and ends at 5
            Purchase(3, [6], Day.AddDays(2)));        // 5 before it: past the line of 4
        await db.SaveChangesAsync();

        var ids = await PioneerBlocks.PurchaseIdsAsync(db, threshold: 4);

        Assert.Equal(new HashSet<int> { 1, 2 }, ids);
    }

    [Fact]
    public async Task APurchaseLandingExactlyOnTheLine_ClosesIt()
    {
        await using var db = CreateDb();
        db.Purchases.AddRange(
            Purchase(1, [1, 2], Day),
            Purchase(2, [3, 4], Day.AddDays(1)),
            Purchase(3, [5], Day.AddDays(2)));
        await db.SaveChangesAsync();

        var ids = await PioneerBlocks.PurchaseIdsAsync(db, threshold: 4);

        Assert.Equal(new HashSet<int> { 1, 2 }, ids);
    }

    [Fact]
    public async Task OrdersByConfirmation_FallingBackToThePurchaseDate()
    {
        await using var db = CreateDb();
        db.Purchases.AddRange(
            // Started first, but the money only landed a week later.
            Purchase(1, [1, 2], Day, confirmed: Day.AddDays(7)),
            // An older row with no confirmation time, ordered by its purchase date instead.
            Purchase(2, [3, 4], Day.AddDays(1)),
            Purchase(3, [5], Day.AddDays(2), confirmed: Day.AddDays(2)));
        await db.SaveChangesAsync();

        var ids = await PioneerBlocks.PurchaseIdsAsync(db, threshold: 3);

        Assert.Equal(new HashSet<int> { 2, 3 }, ids);
    }

    [Fact]
    public async Task BreaksTiesById()
    {
        await using var db = CreateDb();
        db.Purchases.AddRange(
            Purchase(2, [3, 4], Day),
            Purchase(1, [1, 2], Day));
        await db.SaveChangesAsync();

        var ids = await PioneerBlocks.PurchaseIdsAsync(db, threshold: 2);

        Assert.Equal(new HashSet<int> { 1 }, ids);
    }

    [Fact]
    public async Task IgnoresPendingAndCancelledPurchases()
    {
        await using var db = CreateDb();
        db.Purchases.AddRange(
            Purchase(1, [1, 2, 3], Day, status: PaymentStatus.Pending),
            Purchase(2, [4, 5, 6], Day, status: PaymentStatus.Cancelled),
            Purchase(3, [7, 8], Day.AddDays(1)),
            Purchase(4, [9], Day.AddDays(2)),
            Purchase(5, [10], Day.AddDays(3)));
        await db.SaveChangesAsync();

        var ids = await PioneerBlocks.PurchaseIdsAsync(db, threshold: 3);

        // Had the unpaid six counted, the line would have been crossed before purchase 3.
        Assert.Equal(new HashSet<int> { 3, 4 }, ids);
    }

    [Fact]
    public async Task Among_PicksOutTheBlocksOfQualifyingPurchases()
    {
        await using var db = CreateDb();
        db.Purchases.AddRange(
            Purchase(1, [10, 11], Day),
            Purchase(2, [12], Day.AddDays(1)),
            Purchase(3, [13], Day.AddDays(2), status: PaymentStatus.Pending));
        await db.SaveChangesAsync();

        var squares = await PioneerBlocks.AmongAsync(db, [10, 12, 13, 99], threshold: 2);

        Assert.Equal(new HashSet<int> { 10 }, squares);
    }
}
