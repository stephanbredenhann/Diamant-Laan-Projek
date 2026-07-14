using System.Net;
using System.Text;
using System.Threading.RateLimiting;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Middleware;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://*:{port}");
}

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured. Set it via user secrets or environment variables.");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes for HS256.");

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=diamantlaan.db";
if (Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME") != null && connectionString.Contains("diamantlaan.db") && !connectionString.Contains("/home/"))
{
    connectionString = "Data Source=/home/site/diamantlaan.db";
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.AllowedForNewUsers = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();
builder.Services.Configure<ResendSettings>(builder.Configuration.GetSection("Resend"));
builder.Services.AddSingleton<IEmailService, ResendEmailService>();
builder.Services.AddScoped<RefreshTokenService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<SiteSettingsService>();
builder.Services.AddScoped<ProfileRateLimitService>();
builder.Services.AddScoped<PasswordResetOtpService>();
builder.Services.AddScoped<BlockNotificationService>();
builder.Services.AddScoped<EmailOutboxService>();
builder.Services.AddSingleton<EmailHealthService>();
builder.Services.AddHostedService<PendingReservationCleanupService>();
builder.Services.AddHostedService<BlockNotificationBackgroundService>();
builder.Services.AddHostedService<EmailOutboxBackgroundService>();
builder.Services.AddHostedService<SqliteBackupBackgroundService>();

var payFastSettings = builder.Configuration.GetSection("PayFast").Get<PayFastSettings>()
    ?? new PayFastSettings();

builder.Services.AddSingleton(payFastSettings);
builder.Services.AddHttpClient<IPayFastService, PayFastService>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.AddPolicy("reset-password", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.AddPolicy("purchase", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? httpContext.Connection.RemoteIpAddress?.ToString()
                ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.AddPolicy("profile", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? httpContext.Connection.RemoteIpAddress?.ToString()
                ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0
            }));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

var appPayFastSettings = app.Services.GetRequiredService<PayFastSettings>();
if (string.IsNullOrWhiteSpace(appPayFastSettings.MerchantId) ||
    string.IsNullOrWhiteSpace(appPayFastSettings.MerchantKey))
{
    app.Logger.LogWarning("PayFast MerchantId and/or MerchantKey are not configured. Payments will fail until they are set via user secrets or environment variables.");
}
if (string.IsNullOrWhiteSpace(appPayFastSettings.Passphrase))
{
    app.Logger.LogWarning("PayFast Passphrase is not configured. PayFast will reject payment signatures until it matches the merchant dashboard setting via user secrets or environment variables.");
}

var resendSettings = app.Configuration.GetSection("Resend").Get<ResendSettings>() ?? new ResendSettings();
if (string.IsNullOrWhiteSpace(resendSettings.ApiKey) || string.IsNullOrWhiteSpace(resendSettings.FromEmail))
{
    app.Logger.LogWarning("Resend ApiKey and/or FromEmail are not configured. Transactional emails will be skipped until they are set via user secrets or environment variables.");
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
    ForwardLimit = 2
};
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
if (Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME") != null)
{
    forwardedHeadersOptions.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
    forwardedHeadersOptions.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Parse("172.16.0.0"), 12));
    forwardedHeadersOptions.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Parse("192.168.0.0"), 16));
}
app.UseForwardedHeaders(forwardedHeadersOptions);

app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-XSS-Protection"] = "0";
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("DevCors");
}

app.UseRateLimiter();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseMiddleware<MustChangePasswordMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.Map("/api/{**catchall}", () => Results.NotFound(new { message = "API-endpunt nie gevind nie." }));
app.MapFallbackToFile("index.html");

app.Map("/error", () => Results.Json(new { message = "Interne bedienerfout." }, statusCode: 500));

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var userManager = services.GetRequiredService<UserManager<User>>();
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    var db = services.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");
    var adminEmail = app.Configuration["AdminUser:Email"];
    var adminPassword = app.Configuration["AdminUser:Password"];
    if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
    {
        await AppDbContext.SeedAsync(userManager, roleManager, db, adminEmail, adminPassword);
    }
    else
    {
        app.Logger.LogWarning("AdminUser:Email or AdminUser:Password is not configured. Skipping admin user seeding.");
    }
}

app.Run();
