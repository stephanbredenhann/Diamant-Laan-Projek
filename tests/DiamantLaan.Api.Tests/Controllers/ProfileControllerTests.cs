using System.Security.Claims;
using DiamantLaan.Api.Controllers;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

public class ProfileControllerTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static ProfileController CreateController(AppDbContext db, User user, Mock<UserManager<User>> userManager)
    {
        userManager.Setup(m => m.FindByIdAsync(user.Id)).ReturnsAsync(user);

        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:RefreshExpireDays"] = "7"
        }).Build();
        var refresh = new RefreshTokenService(db, config);

        var controller = new ProfileController(userManager.Object, new ProfileRateLimitService(db), refresh);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id)
                }, "Test"))
            }
        };
        return controller;
    }

    private static Mock<UserManager<User>> CreateUserManagerMock()
    {
        var store = new Mock<IUserStore<User>>();
        return new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
    }

    [Fact]
    public async Task Update_Returns429_WhenRateLimitExceeded()
    {
        await using var db = CreateDb();
        var user = new User { Id = "u1", Email = "a@b.com", UserName = "a@b.com", FirstName = "A", LastName = "B" };
        for (var i = 0; i < 3; i++)
        {
            db.ProfileChangeLogs.Add(new ProfileChangeLog
            {
                UserId = user.Id,
                ChangeType = ProfileChangeTypes.Profile,
                CreatedAt = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync();

        var userManager = CreateUserManagerMock();
        var controller = CreateController(db, user, userManager);
        var result = await controller.Update(new UpdateProfileDto
        {
            FirstName = "New",
            LastName = "Name",
            PhoneCountryCode = "+27",
            ReceiveBlockProgressEmails = true
        });

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, objectResult.StatusCode);
    }

    [Fact]
    public async Task UpdateEmail_RequiresCurrentPassword()
    {
        await using var db = CreateDb();
        var user = new User { Id = "u1", Email = "a@b.com", UserName = "a@b.com", FirstName = "A", LastName = "B" };
        var userManager = CreateUserManagerMock();
        userManager.Setup(m => m.CheckPasswordAsync(user, "wrong")).ReturnsAsync(false);
        var controller = CreateController(db, user, userManager);

        var result = await controller.UpdateEmail(new UpdateEmailDto
        {
            Email = "new@b.com",
            CurrentPassword = "wrong"
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("wagwoord", bad.Value!.ToString()!, StringComparison.OrdinalIgnoreCase);
    }
}
