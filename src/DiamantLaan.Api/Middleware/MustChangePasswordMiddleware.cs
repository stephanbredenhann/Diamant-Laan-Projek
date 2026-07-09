using System.Security.Claims;

namespace DiamantLaan.Api.Middleware;

public class MustChangePasswordMiddleware
{
    private readonly RequestDelegate _next;

    public MustChangePasswordMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true
            && context.User.HasClaim("MustChangePassword", "True")
            && !IsAllowedPath(context.Request))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "Jy moet eers jou wagwoord verander voordat jy voortgaan."
            });
            return;
        }

        await _next(context);
    }

    private static bool IsAllowedPath(HttpRequest request)
    {
        var path = request.Path.Value ?? string.Empty;

        if (path.Equals("/api/auth/complete-required-password-change", StringComparison.OrdinalIgnoreCase)
            && request.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            return true;

        if (path.Equals("/api/auth/logout", StringComparison.OrdinalIgnoreCase)
            && request.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            return true;

        if (path.Equals("/api/profile", StringComparison.OrdinalIgnoreCase)
            && request.Method.Equals("GET", StringComparison.OrdinalIgnoreCase))
            return true;

        return false;
    }
}
