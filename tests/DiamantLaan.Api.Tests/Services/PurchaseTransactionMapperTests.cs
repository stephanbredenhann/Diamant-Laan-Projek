using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class PurchaseTransactionMapperTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static User CreateUser(string id, string first, string last, string email)
    {
        return new User
        {
            Id = id,
            UserName = email,
            Email = email,
            FirstName = first,
            LastName = last
        };
    }

    private static Purchase CreatePurchase(
        int id,
        string userId,
        decimal amount,
        PaymentStatus status,
        params int[] squareIds)
    {
        var purchase = new Purchase
        {
            Id = id,
            UserId = userId,
            Amount = amount,
            PaymentStatus = status,
            PurchaseDate = DateTime.UtcNow.AddDays(-id)
        };

        foreach (var squareId in squareIds)
        {
            purchase.PurchaseSquares.Add(new PurchaseSquare { PurchaseId = id, SquareId = squareId });
        }

        return purchase;
    }

    [Fact]
    public void ToDto_MapsAmountPerBlockFromSquareCount()
    {
        var user = CreateUser("u1", "Jan", "Smit", "jan@example.com");
        var purchase = CreatePurchase(1, "u1", 1000m, PaymentStatus.Confirmed, 101, 102);
        purchase.User = user;

        var dto = PurchaseTransactionMapper.ToDto(purchase);

        Assert.Equal(2, dto.SquareCount);
        Assert.Equal(500m, dto.AmountPerBlock);
        Assert.Equal(new[] { 101, 102 }, dto.SquareIds);
        Assert.Equal("Confirmed", dto.PaymentStatus);
        Assert.Null(dto.UserName);
    }

    [Fact]
    public void ToDto_WithIncludeUser_AddsBuyerFields()
    {
        var user = CreateUser("u1", "Jan", "Smit", "jan@example.com");
        var purchase = CreatePurchase(1, "u1", 1000m, PaymentStatus.Confirmed, 101);
        purchase.User = user;
        purchase.PayFastPaymentId = "PF-123";

        var dto = PurchaseTransactionMapper.ToDto(purchase, includeUser: true);

        Assert.Equal("Jan Smit", dto.UserName);
        Assert.Equal("jan@example.com", dto.UserEmail);
        Assert.Equal("PF-123", dto.PayFastPaymentId);
    }

    [Fact]
    public async Task ConfirmedPurchases_AppearAsSeparateRowsPerCheckout()
    {
        await using var db = CreateDb();
        var user = CreateUser("u1", "Jan", "Smit", "jan@example.com");
        db.Users.Add(user);

        var purchase1 = CreatePurchase(1, "u1", 1000m, PaymentStatus.Confirmed, 101, 102);
        purchase1.User = user;
        var purchase2 = CreatePurchase(2, "u1", 1000m, PaymentStatus.Confirmed, 103);
        purchase2.User = user;

        db.Purchases.AddRange(purchase1, purchase2);
        await db.SaveChangesAsync();

        var rows = await db.Purchases
            .Include(p => p.PurchaseSquares)
            .Where(p => p.UserId == "u1" && p.PaymentStatus == PaymentStatus.Confirmed)
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync();

        var dtos = rows.Select(p => PurchaseTransactionMapper.ToDto(p)).ToList();

        Assert.Equal(2, dtos.Count);
        Assert.Equal(2, dtos[0].SquareCount);
        Assert.Equal(1, dtos[1].SquareCount);
    }

    [Fact]
    public async Task UserQuery_ExcludesOtherUsersAndNonConfirmed()
    {
        await using var db = CreateDb();
        var user1 = CreateUser("u1", "Jan", "Smit", "jan@example.com");
        var user2 = CreateUser("u2", "Piet", "Nel", "piet@example.com");
        db.Users.AddRange(user1, user2);

        var confirmed = CreatePurchase(1, "u1", 500m, PaymentStatus.Confirmed, 101);
        confirmed.User = user1;
        var pending = CreatePurchase(2, "u1", 500m, PaymentStatus.Pending, 102);
        pending.User = user1;
        var otherUser = CreatePurchase(3, "u2", 500m, PaymentStatus.Confirmed, 103);
        otherUser.User = user2;

        db.Purchases.AddRange(confirmed, pending, otherUser);
        await db.SaveChangesAsync();

        var userRows = await db.Purchases
            .Include(p => p.PurchaseSquares)
            .Where(p => p.UserId == "u1" && p.PaymentStatus == PaymentStatus.Confirmed)
            .ToListAsync();

        var adminRows = await db.Purchases
            .Include(p => p.User)
            .Include(p => p.PurchaseSquares)
            .Where(p => p.PaymentStatus == PaymentStatus.Confirmed)
            .ToListAsync();

        Assert.Single(userRows);
        Assert.Equal(2, adminRows.Count);
        Assert.All(adminRows, p => Assert.Equal(PaymentStatus.Confirmed, p.PaymentStatus));
    }
}
