using DiamantLaan.Api.Middleware;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Xunit;

namespace DiamantLaan.Api.Tests.Middleware;

public class MustChangePasswordMiddlewareTests
{
    [Fact]
    public async Task BlocksAuthenticatedUser_WithMustChangePasswordClaim()
    {
        var called = false;
        var middleware = new MustChangePasswordMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        var context = new DefaultHttpContext();
        context.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "u1"),
            new Claim("MustChangePassword", "True")
        }, "test"));
        context.Request.Path = "/api/purchase";
        context.Request.Method = "POST";

        await middleware.InvokeAsync(context);

        Assert.False(called);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task AllowsPasswordChangeEndpoint()
    {
        var called = false;
        var middleware = new MustChangePasswordMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        var context = new DefaultHttpContext();
        context.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "u1"),
            new Claim("MustChangePassword", "True")
        }, "test"));
        context.Request.Path = "/api/auth/complete-required-password-change";
        context.Request.Method = "POST";

        await middleware.InvokeAsync(context);

        Assert.True(called);
    }
}
