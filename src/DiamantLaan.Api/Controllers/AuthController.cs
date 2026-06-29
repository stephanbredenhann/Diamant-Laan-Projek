using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly IConfiguration _config;
    private readonly RefreshTokenService _refreshTokens;

    public AuthController(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IConfiguration config,
        RefreshTokenService refreshTokens)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _config = config;
        _refreshTokens = refreshTokens;
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var user = new User
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            PhoneNumber = dto.PhoneNumber,
            IsOraniaResident = dto.IsOraniaResident
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
            return BadRequest(new { message = "Registrasie het misluk. Kontroleer jou besonderhede en probeer weer." });

        await _userManager.AddToRoleAsync(user, "Buyer");

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);
        var refresh = await _refreshTokens.CreateAsync(user.Id);
        SetRefreshCookie(refresh.Token);

        return Ok(new { token, user.Email, user.FirstName, user.LastName, user.PhoneNumber, user.IsOraniaResident, roles });
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
            return Unauthorized(new { message = "Ongeldige e-pos of wagwoord." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return Unauthorized(new { message = "Rekening is tydelik gesluit weens te veel mislukte pogings." });
        if (!result.Succeeded)
            return Unauthorized(new { message = "Ongeldige e-pos of wagwoord." });

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);
        var refresh = await _refreshTokens.CreateAsync(user.Id);
        SetRefreshCookie(refresh.Token);

        return Ok(new { token, user.Email, user.FirstName, user.LastName, user.PhoneNumber, user.IsOraniaResident, roles });
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { message = "Verfrissing-token ontbreek." });

        var stored = await _refreshTokens.ValidateAsync(refreshToken);
        if (stored == null)
            return Unauthorized(new { message = "Verfrissing-token is ongeldig of verval." });

        var roles = await _userManager.GetRolesAsync(stored.User);
        var token = GenerateJwtToken(stored.User, roles);
        await _refreshTokens.RevokeAsync(refreshToken);
        var newRefresh = await _refreshTokens.CreateAsync(stored.UserId);
        SetRefreshCookie(newRefresh.Token);

        return Ok(new
        {
            token,
            stored.User.Email,
            stored.User.FirstName,
            stored.User.LastName,
            stored.User.PhoneNumber,
            stored.User.IsOraniaResident,
            roles
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refreshToken))
            await _refreshTokens.RevokeAsync(refreshToken);

        Response.Cookies.Delete("refreshToken");
        return Ok(new { message = "Uitgeteken." });
    }

    private void SetRefreshCookie(string token)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(int.Parse(_config["Jwt:RefreshExpireDays"] ?? "7")),
            Path = "/api/auth"
        });
    }

    private string GenerateJwtToken(User user, IList<string> roles)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.GivenName, user.FirstName),
            new(ClaimTypes.Surname, user.LastName),
            new("PhoneNumber", user.PhoneNumber ?? ""),
            new("IsOraniaResident", user.IsOraniaResident.ToString())
        };

        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:ExpireMinutes"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
