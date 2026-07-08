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

public class AuthPasswordResetTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task ForgotPassword_ReturnsGenericSuccess_EvenWhenUserMissing()
    {
        await using var db = CreateDb();
        var store = new Mock<IUserStore<User>>();
        var userManager = new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        userManager.Setup(m => m.FindByEmailAsync("missing@test.com")).ReturnsAsync((User?)null);

        var signIn = new Mock<SignInManager<User>>(
            userManager.Object,
            Mock.Of<IHttpContextAccessor>(),
            Mock.Of<IUserClaimsPrincipalFactory<User>>(),
            null!, null!, null!, null!);

        var email = new Mock<IEmailService>();
        var otp = new PasswordResetOtpService(db, userManager.Object, email.Object);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "01234567890123456789012345678901",
            ["Jwt:Issuer"] = "test",
            ["Jwt:Audience"] = "test",
            ["Jwt:ExpireMinutes"] = "60",
            ["Jwt:RefreshExpireDays"] = "7"
        }).Build();
        var refresh = new RefreshTokenService(db, config);

        var controller = new AuthController(userManager.Object, signIn.Object, config, refresh, otp)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        var result = await controller.ForgotPassword(new ForgotPasswordDto { Email = "missing@test.com" });
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("gestuur", ok.Value!.ToString()!, StringComparison.OrdinalIgnoreCase);
        email.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task PasswordResetOtpService_CreatesHashedOtpAndSendsEmail()
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = "u1",
            Email = "user@test.com",
            UserName = "user@test.com",
            FirstName = "Jan"
        };
        var store = new Mock<IUserStore<User>>();
        var userManager = new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        userManager.Setup(m => m.FindByEmailAsync(user.Email)).ReturnsAsync(user);

        var email = new Mock<IEmailService>();
        email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var service = new PasswordResetOtpService(db, userManager.Object, email.Object);
        await service.RequestAsync(user.Email!);

        Assert.Equal(1, await db.PasswordResetOtps.CountAsync());
        var otp = await db.PasswordResetOtps.SingleAsync();
        Assert.False(otp.Used);
        Assert.Equal(64, otp.CodeHash.Length);
        email.Verify(e => e.SendAsync(
            "user@test.com",
            It.Is<string>(s => s.Contains("wagwoord")),
            It.IsAny<string>(),
            It.Is<string>(k => k.StartsWith("password-reset-otp/u1/")),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
