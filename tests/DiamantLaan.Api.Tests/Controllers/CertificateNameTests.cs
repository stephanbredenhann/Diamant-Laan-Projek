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

    private static async Task Seed(AppDbContext db, string id = "u1", int squares = 3)
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
    }

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
        // Blocks matching the summary are stored as "no override" so they follow it later.
        Assert.Null(db.Squares.First(s => s.Id == 1).CertificateName);
        Assert.Equal("Anna Berg", db.Squares.First(s => s.Id == 2).CertificateName);
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
