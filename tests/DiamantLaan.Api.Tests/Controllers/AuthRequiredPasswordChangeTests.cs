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
using System.Security.Claims;
using Xunit;

namespace DiamantLaan.Api.Tests.Controllers;

public class AuthRequiredPasswordChangeTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CompleteRequiredPasswordChange_ClearsFlagAndReturnsUpdatedPayload()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            Email = "user@test.com",
            UserName = "user@test.com",
            FirstName = "Jan",
            LastName = "Boer",
            MustChangePassword = true
        };

        var store = new Mock<IUserStore<User>>();
        var userManager = new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        userManager.Setup(m => m.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);
        userManager.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync("token");
        userManager.Setup(m => m.ResetPasswordAsync(user, "token", "Str0ng!New"))
            .ReturnsAsync(IdentityResult.Success);
        userManager.Setup(m => m.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);
        userManager.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string> { "Buyer" });

        var signIn = new Mock<SignInManager<User>>(
            userManager.Object,
            Mock.Of<IHttpContextAccessor>(),
            Mock.Of<IUserClaimsPrincipalFactory<User>>(),
            null!, null!, null!, null!);

        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "01234567890123456789012345678901",
            ["Jwt:Issuer"] = "test",
            ["Jwt:Audience"] = "test",
            ["Jwt:ExpireMinutes"] = "60",
            ["Jwt:RefreshExpireDays"] = "7"
        }).Build();
        var refresh = new RefreshTokenService(db, config);
        var otp = new PasswordResetOtpService(db, userManager.Object, Mock.Of<IEmailService>());

        var controller = new AuthController(userManager.Object, signIn.Object, config, refresh, otp)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id)
                }, "test")) }
            }
        };

        var result = await controller.CompleteRequiredPasswordChange(new CompleteRequiredPasswordChangeDto
        {
            NewPassword = "Str0ng!New",
            ConfirmPassword = "Str0ng!New"
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.False(user.MustChangePassword);
        Assert.Contains("mustChangePassword", ok.Value!.ToString()!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CompleteRequiredPasswordChange_RejectsWhenFlagNotSet()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            Email = "user@test.com",
            UserName = "user@test.com",
            MustChangePassword = false
        };

        var store = new Mock<IUserStore<User>>();
        var userManager = new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        userManager.Setup(m => m.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

        var signIn = new Mock<SignInManager<User>>(
            userManager.Object,
            Mock.Of<IHttpContextAccessor>(),
            Mock.Of<IUserClaimsPrincipalFactory<User>>(),
            null!, null!, null!, null!);

        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "01234567890123456789012345678901",
            ["Jwt:Issuer"] = "test",
            ["Jwt:Audience"] = "test",
            ["Jwt:ExpireMinutes"] = "60",
            ["Jwt:RefreshExpireDays"] = "7"
        }).Build();
        var refresh = new RefreshTokenService(db, config);
        var otp = new PasswordResetOtpService(db, userManager.Object, Mock.Of<IEmailService>());

        var controller = new AuthController(userManager.Object, signIn.Object, config, refresh, otp)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id)
                }, "test")) }
            }
        };

        var result = await controller.CompleteRequiredPasswordChange(new CompleteRequiredPasswordChangeDto
        {
            NewPassword = "Str0ng!New",
            ConfirmPassword = "Str0ng!New"
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
