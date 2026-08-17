using System.Security.Claims;
using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

/// <summary>
/// The names printed on certificates: one shared name, or one per block. The fallback rules are
/// the part worth pinning down, because a block with no name of its own has to follow the summary.
/// </summary>
public class CertificateNameTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static MySquaresController Controller(AppDbContext db, string userId = "u1")
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["App:PublicUrl"] = "https://diamantlaan.example"
        }).Build();

        return new MySquaresController(db, new ShareLinkService(db, config))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[] { new Claim(ClaimTypes.NameIdentifier, userId) }, "Test"))
                }
            }
        };
    }

    /// <summary>
    /// An account with <paramref name="squares"/> blocks, all bought on one confirmed purchase
    /// <paramref name="boughtAgo"/> ago. Fresh by default, so most tests run inside the window.
    /// </summary>
    private static async Task Seed(
        AppDbContext db, string id = "u1", int squares = 3, TimeSpan? boughtAgo = null)
    {
        db.Users.Add(new User
        {
            Id = id,
            UserName = $"{id}@x.com",
            Email = $"{id}@x.com",
            FirstName = "Jan",
            LastName = "Berg"
        });
        for (var i = 1; i <= squares; i++)
            db.Squares.Add(new Square { Id = i, Status = SquareStatus.NogNieBeginNie, OwnerId = id });
        await db.SaveChangesAsync();

        if (squares > 0)
            await Buy(db, id, Enumerable.Range(1, squares), boughtAgo ?? TimeSpan.Zero);
    }

    /// <summary>Records a confirmed purchase, which is what opens the 15-minute window.</summary>
    private static async Task Buy(AppDbContext db, string userId, IEnumerable<int> squareIds, TimeSpan ago)
    {
        var when = DateTime.UtcNow - ago;
        var purchase = new Purchase
        {
            UserId = userId,
            PurchaseDate = when,
            ConfirmedAt = when,
            PaymentStatus = PaymentStatus.Confirmed,
            Amount = 500
        };
        db.Purchases.Add(purchase);
        await db.SaveChangesAsync();

        foreach (var squareId in squareIds)
            db.PurchaseSquares.Add(new PurchaseSquare { PurchaseId = purchase.Id, SquareId = squareId });
        await db.SaveChangesAsync();
    }

    private static readonly TimeSpan LongAgo = MySquaresController.CertificateEditWindow + TimeSpan.FromMinutes(1);

    private static CertificateNamesDto Names(IActionResult result) =>
        Assert.IsType<CertificateNamesDto>(Assert.IsType<OkObjectResult>(result).Value);

    [Fact]
    public async Task Get_FallsBackToAccountName()
    {
        await using var db = CreateDb();
        await Seed(db);

        var names = Names(await Controller(db).GetCertificateNames());

        Assert.True(names.SameForAll);
        Assert.Equal("Jan Berg", names.SummaryName);
        Assert.All(names.Blocks, b => Assert.Equal("Jan Berg", b.Name));
    }

    [Fact]
    public async Task Save_SameForAll_ClearsPerBlockNames()
    {
        await using var db = CreateDb();
        await Seed(db);
        db.Squares.First(s => s.Id == 2).CertificateName = "Anna Berg";
        await db.SaveChangesAsync();

        var names = Names(await Controller(db).SaveCertificateNames(new SaveCertificateNamesDto
        {
            SameForAll = true,
            SummaryName = "Piet Berg"
        }));

        Assert.True(names.SameForAll);
        Assert.All(names.Blocks, b => Assert.Equal("Piet Berg", b.Name));
        Assert.All(db.Squares, s => Assert.Null(s.CertificateName));
    }

    [Fact]
    public async Task Save_PerBlock_KeepsOnlyRealDifferences()
    {
        await using var db = CreateDb();
        await Seed(db);

        var names = Names(await Controller(db).SaveCertificateNames(new SaveCertificateNamesDto
        {
            SameForAll = false,
            SummaryName = "Jan Berg",
            Blocks = new List<BlockCertificateNameDto>
            {
                new() { SquareId = 1, Name = "Jan Berg" },
                new() { SquareId = 2, Name = "Anna Berg" },
                new() { SquareId = 3, Name = "Jan Berg" },
            }
        }));

        Assert.False(names.SameForAll);
        Assert.Equal("Anna Berg", names.Blocks.Single(b => b.SquareId == 2).Name);
        // Stored as typed, even where it matches the summary: with the window there is no later
        // edit for a block to follow, and the mode is now a stored fact rather than a derived one.
        Assert.Equal("Jan Berg", db.Squares.First(s => s.Id == 1).CertificateName);
        Assert.Equal("Anna Berg", db.Squares.First(s => s.Id == 2).CertificateName);
    }

    [Fact]
    public async Task Save_PerBlock_SurvivesEvenWhenEveryNameMatchesTheSummary()
    {
        await using var db = CreateDb();
        await Seed(db);

        await Controller(db).SaveCertificateNames(new SaveCertificateNamesDto
        {
            SameForAll = false,
            SummaryName = "Jan Berg",
            Blocks = Enumerable.Range(1, 3)
                .Select(i => new BlockCertificateNameDto { SquareId = i, Name = "Jan Berg" })
                .ToList()
        });

        // Someone who wants a sheet per block but the same name on each still gets sheets per
        // block: the choice is stored, not inferred from whether the names happen to differ.
        var names = Names(await Controller(db).GetCertificateNames());
        Assert.False(names.SameForAll);
    }

    [Fact]
    public async Task Get_ReportsTheWindowAsClosedOnceItHasPassed()
    {
        await using var db = CreateDb();
        await Seed(db, boughtAgo: LongAgo);

        var names = Names(await Controller(db).GetCertificateNames());

        Assert.False(names.CanEdit);
        Assert.Null(names.EditableUntil);
        Assert.All(names.Blocks, b => Assert.False(b.CanEdit));
    }

    [Fact]
    public async Task Save_IsRefusedOnceEveryWindowHasClosed()
    {
        await using var db = CreateDb();
        await Seed(db, boughtAgo: LongAgo);

        var result = await Controller(db).SaveCertificateNames(new SaveCertificateNamesDto
        {
            SameForAll = true,
            SummaryName = "Nuwe Naam"
        });

        Assert.Equal(StatusCodes.Status403Forbidden, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.Null(db.Users.First().CertificateName);
    }

    [Fact]
    public async Task Save_AfterABuyingAgain_TouchesOnlyTheNewBlock()
    {
        await using var db = CreateDb();
        await Seed(db, boughtAgo: LongAgo);
        db.Squares.First(s => s.Id == 1).CertificateName = "Ou Naam";
        db.Squares.Add(new Square { Id = 7, Status = SquareStatus.NogNieBeginNie, OwnerId = "u1" });
        await db.SaveChangesAsync();
        await Buy(db, "u1", new[] { 7 }, TimeSpan.Zero);

        var names = Names(await Controller(db).SaveCertificateNames(new SaveCertificateNamesDto
        {
            SameForAll = false,
            SummaryName = "Jan Berg",
            Blocks = new List<BlockCertificateNameDto>
            {
                new() { SquareId = 1, Name = "Gekaap" },
                new() { SquareId = 7, Name = "Anna Berg" },
            }
        }));

        Assert.Equal("Ou Naam", db.Squares.First(s => s.Id == 1).CertificateName);
        Assert.Equal("Anna Berg", db.Squares.First(s => s.Id == 7).CertificateName);
        Assert.False(names.Blocks.Single(b => b.SquareId == 1).CanEdit);
        Assert.True(names.Blocks.Single(b => b.SquareId == 7).CanEdit);
    }

    [Fact]
    public async Task Save_SameForAll_LeavesLockedBlocksAsTheyWereIssued()
    {
        await using var db = CreateDb();
        await Seed(db, boughtAgo: LongAgo);
        db.Squares.First(s => s.Id == 2).CertificateName = "Anna Berg";
        db.Squares.Add(new Square { Id = 7, Status = SquareStatus.NogNieBeginNie, OwnerId = "u1" });
        await db.SaveChangesAsync();
        await Buy(db, "u1", new[] { 7 }, TimeSpan.Zero);

        await Controller(db).SaveCertificateNames(new SaveCertificateNamesDto
        {
            SameForAll = true,
            SummaryName = "Piet Berg"
        });

        Assert.Equal("Anna Berg", db.Squares.First(s => s.Id == 2).CertificateName);
        Assert.Null(db.Squares.First(s => s.Id == 7).CertificateName);
    }

    [Fact]
    public async Task Save_IgnoresBlocksBelongingToSomeoneElse()
    {
        await using var db = CreateDb();
        await Seed(db);
        await Seed(db, "u2", squares: 0);
        db.Squares.Add(new Square { Id = 99, Status = SquareStatus.NogNieBeginNie, OwnerId = "u2" });
        await db.SaveChangesAsync();

        await Controller(db).SaveCertificateNames(new SaveCertificateNamesDto
        {
            SameForAll = false,
            SummaryName = "Jan Berg",
            Blocks = new List<BlockCertificateNameDto> { new() { SquareId = 99, Name = "Kaper" } }
        });

        Assert.Null(db.Squares.First(s => s.Id == 99).CertificateName);
    }

    [Fact]
    public async Task Save_RejectsAnEmptySummaryName()
    {
        await using var db = CreateDb();
        await Seed(db);

        var result = await Controller(db).SaveCertificateNames(new SaveCertificateNamesDto
        {
            SameForAll = true,
            SummaryName = " J "
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
