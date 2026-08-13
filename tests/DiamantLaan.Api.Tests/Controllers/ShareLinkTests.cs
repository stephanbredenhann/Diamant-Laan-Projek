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

public class ShareLinkTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static IConfiguration Config() =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["App:PublicUrl"] = "https://diamantlaan.example"
        }).Build();

    private static SharePageController SharePage(AppDbContext db, string? userAgent = null)
    {
        var controller = new SharePageController(
            new ShareLinkService(db, Config()),
            new ShareOgImageService(),
            new SharePageRenderer());
        var http = new DefaultHttpContext
        {
            Request =
            {
                Scheme = "https",
                Host = new HostString("share.example")
            }
        };
        if (userAgent is not null) http.Request.Headers.UserAgent = userAgent;
        controller.ControllerContext = new ControllerContext { HttpContext = http };
        return controller;
    }

    private static MySquaresController SquaresController(AppDbContext db, string userId)
    {
        var controller = new MySquaresController(db, new ShareLinkService(db, Config()));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId)
                }, "Test"))
            }
        };
        return controller;
    }

    private static async Task<User> SeedUserWithSquares(AppDbContext db, string id = "u1", int squares = 2, bool anonymized = false)
    {
        var user = new User
        {
            Id = id,
            UserName = $"{id}@x.com",
            Email = $"{id}@x.com",
            FirstName = "Jan",
            LastName = "Berg",
            IsAnonymized = anonymized
        };
        db.Users.Add(user);
        for (var i = 1; i <= squares; i++)
        {
            db.Squares.Add(new Square { Id = i, Status = SquareStatus.NogNieBeginNie, OwnerId = id });
        }
        await db.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task GetShareLink_Returns404_WhenMissing()
    {
        await using var db = CreateDb();
        await SeedUserWithSquares(db);
        var controller = SquaresController(db, "u1");

        var result = await controller.GetShareLink();

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task CreateShareLink_IsIdempotent()
    {
        await using var db = CreateDb();
        await SeedUserWithSquares(db);
        var controller = SquaresController(db, "u1");

        var first = Assert.IsType<OkObjectResult>(await controller.CreateShareLink());
        var firstDto = Assert.IsType<ShareLinkDto>(first.Value);
        var second = Assert.IsType<OkObjectResult>(await controller.CreateShareLink());
        var secondDto = Assert.IsType<ShareLinkDto>(second.Value);

        Assert.Equal(firstDto.Url, secondDto.Url);
        Assert.StartsWith("https://diamantlaan.example/deel/", firstDto.Url);
        Assert.StartsWith("/deel/", firstDto.Path);
        Assert.Equal(firstDto.Path, new Uri(firstDto.Url).AbsolutePath);
        Assert.Equal(1, db.Users.Count(u => u.ShareToken != null));
    }

    [Fact]
    public async Task CreateShareLink_RejectsZeroSquares()
    {
        await using var db = CreateDb();
        db.Users.Add(new User { Id = "u1", UserName = "a@b.com", Email = "a@b.com", FirstName = "Jan", LastName = "Berg" });
        await db.SaveChangesAsync();
        var controller = SquaresController(db, "u1");

        var result = await controller.CreateShareLink();

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("vierkante meter", bad.Value!.ToString()!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateShareLink_RejectsAnonymizedUser()
    {
        await using var db = CreateDb();
        await SeedUserWithSquares(db, anonymized: true);
        var controller = SquaresController(db, "u1");

        var result = await controller.CreateShareLink();

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task PublicPage_ContainsEscapedNameAndMeterPhrase()
    {
        await using var db = CreateDb();
        var user = await SeedUserWithSquares(db, squares: 5);
        user.FirstName = "<script>Jan";
        user.ShareToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        await db.SaveChangesAsync();

        var page = SharePage(db, "facebookexternalhit/1.1");

        var result = await page.Page(user.ShareToken);
        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal(200, content.StatusCode ?? 200);
        // HtmlEncode turns the ² into a numeric entity.
        Assert.Contains("5 m&#178; geborg vir die Oewerpad in Orania!", content.Content);
        Assert.Contains("&lt;script&gt;Jan", content.Content);
        Assert.DoesNotContain("<script>Jan", content.Content);
        Assert.Contains("https://share.example/deel/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/og.jpg?m=5", content.Content);
        Assert.Contains("property=\"og:title\"", content.Content);
    }

    [Fact]
    public async Task PublicPage_ServesTheAppToBrowsers_SoAngularDrawsTheCertificate()
    {
        await using var db = CreateDb();
        var user = await SeedUserWithSquares(db, squares: 5);
        user.ShareToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        await db.SaveChangesAsync();

        var page = SharePage(db, "Mozilla/5.0 (Linux; Android 14) Chrome/126");

        var file = Assert.IsType<VirtualFileResult>(await page.Page(user.ShareToken));
        Assert.Equal("~/index.html", file.FileName);
    }

    [Fact]
    public async Task Certificate_ReturnsNameBlocksAndDate()
    {
        await using var db = CreateDb();
        var user = await SeedUserWithSquares(db, squares: 3);
        user.ShareToken = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
        user.CertificateName = "Jan van der Merwe";
        db.Purchases.Add(new Purchase { UserId = user.Id, Amount = 1500, PurchaseDate = new DateTime(2026, 3, 4, 22, 30, 0, DateTimeKind.Utc) });
        await db.SaveChangesAsync();

        var ok = Assert.IsType<OkObjectResult>(await SharePage(db).Certificate(user.ShareToken));
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);

        Assert.Contains("\"name\":\"Jan van der Merwe\"", json);
        Assert.Contains("\"blocks\":[1,2,3]", json);
        Assert.Contains("\"purchaseDate\":\"2026-03-04\"", json);
    }

    [Fact]
    public async Task Certificate_404_AfterRevoke()
    {
        await using var db = CreateDb();
        var user = await SeedUserWithSquares(db);
        user.ShareToken = "ffffffffffffffffffffffffffffffff";
        await db.SaveChangesAsync();

        Assert.IsType<OkObjectResult>(await SharePage(db).Certificate(user.ShareToken));

        await SquaresController(db, "u1").DeleteShareLink();

        Assert.IsType<NotFoundResult>(await SharePage(db).Certificate(user.ShareToken));
    }

    [Fact]
    public async Task PublicPage_UnknownToken_Returns404Html()
    {
        await using var db = CreateDb();
        var page = SharePage(db, "facebookexternalhit/1.1");

        var result = await page.Page("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, content.StatusCode);
        Assert.Contains("nie meer geldig nie", content.Content);
    }

    [Fact]
    public async Task OgImage_ReturnsJpeg1200x630()
    {
        await using var db = CreateDb();
        var user = await SeedUserWithSquares(db, squares: 3);
        user.ShareToken = "cccccccccccccccccccccccccccccccc";
        await db.SaveChangesAsync();

        var page = new SharePageController(
            new ShareLinkService(db, Config()),
            new ShareOgImageService(),
            new SharePageRenderer());

        var result = await page.OgImage(user.ShareToken);
        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("image/jpeg", file.ContentType);

        using var image = SixLabors.ImageSharp.Image.Load(file.FileContents);
        Assert.Equal(1200, image.Width);
        Assert.Equal(630, image.Height);
    }

    [Fact]
    public async Task OgImage_404_AfterRevoke()
    {
        await using var db = CreateDb();
        await SeedUserWithSquares(db);
        var squares = SquaresController(db, "u1");
        var created = Assert.IsType<OkObjectResult>(await squares.CreateShareLink());
        var url = Assert.IsType<ShareLinkDto>(created.Value).Url;
        var token = url.Split('/').Last();

        await squares.DeleteShareLink();

        var page = new SharePageController(
            new ShareLinkService(db, Config()),
            new ShareOgImageService(),
            new SharePageRenderer());
        var result = await page.OgImage(token);
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task PublicPage_404_WhenUserAnonymized()
    {
        await using var db = CreateDb();
        var user = await SeedUserWithSquares(db);
        user.ShareToken = "dddddddddddddddddddddddddddddddd";
        user.IsAnonymized = true;
        await db.SaveChangesAsync();

        var page = SharePage(db, "facebookexternalhit/1.1");
        var result = await page.Page(user.ShareToken);
        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, content.StatusCode);
    }
}
