using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
using DiamantLaan.Api.Validation;
using Microsoft.AspNetCore.Authorization;
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
    private readonly PasswordResetOtpService _passwordResetOtps;

    public AuthController(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IConfiguration config,
        RefreshTokenService refreshTokens,
        PasswordResetOtpService passwordResetOtps)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _config = config;
        _refreshTokens = refreshTokens;
        _passwordResetOtps = passwordResetOtps;
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!EmailValidator.IsValid(dto.Email, out var emailError))
            return BadRequest(new { message = emailError });

        if (dto.Password != dto.ConfirmPassword)
            return BadRequest(new { message = "Wagwoorde stem nie ooreen nie." });

        if (!PasswordValidator.IsValid(dto.Password, out var passwordError))
            return BadRequest(new { message = passwordError });

        if (!PhoneValidator.TryNormalize(dto.PhoneNumber, dto.PhoneCountryCode, out var e164, out var phoneError))
            return BadRequest(new { message = phoneError });

        var user = new User
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            PhoneNumber = string.IsNullOrEmpty(e164) ? null : e164,
            PhoneCountryCode = string.IsNullOrWhiteSpace(dto.PhoneCountryCode) ? "+27" : dto.PhoneCountryCode.Trim(),
            IsOraniaResident = dto.IsOraniaResident,
            IsOraniaBewegingMember = dto.IsOraniaBewegingMember,
            ReceiveBlockProgressEmails = true
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(result) });

        await _userManager.AddToRoleAsync(user, "Buyer");

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);
        var refresh = await _refreshTokens.CreateAsync(user.Id);
        SetRefreshCookie(refresh.Token);

        return Ok(AuthPayload(token, user, roles));
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null || user.IsAnonymized)
            return Unauthorized(new { message = "Ongeldige e-pos of wagwoord." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return Unauthorized(new { message = "Rekening is tydelik gesluit weens te veel mislukte pogings." });
        if (!result.Succeeded)
            return Unauthorized(new { message = "Ongeldige e-pos of wagwoord." });

        if (user.IsAnonymized)
            return Unauthorized(new { message = "Ongeldige e-pos of wagwoord." });

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);
        var refresh = await _refreshTokens.CreateAsync(user.Id);
        SetRefreshCookie(refresh.Token);

        return Ok(AuthPayload(token, user, roles));
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

        if (stored.User.IsAnonymized)
            return Unauthorized(new { message = "Verfrissing-token is ongeldig of verval." });

        var roles = await _userManager.GetRolesAsync(stored.User);
        var token = GenerateJwtToken(stored.User, roles);
        await _refreshTokens.RevokeAsync(refreshToken);
        var newRefresh = await _refreshTokens.CreateAsync(stored.UserId);
        SetRefreshCookie(newRefresh.Token);

        return Ok(AuthPayload(token, stored.User, roles));
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

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        await _passwordResetOtps.RequestAsync(dto.Email.Trim());
        return Ok(new { message = "As die e-pos bestaan, is 'n herstelkode gestuur." });
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (dto.NewPassword != dto.ConfirmPassword)
            return BadRequest(new { message = "Wagwoorde stem nie ooreen nie." });

        if (!PasswordValidator.IsValid(dto.NewPassword, out var passwordError))
            return BadRequest(new { message = passwordError });

        var (success, error) = await _passwordResetOtps.ResetAsync(dto.Email.Trim(), dto.Otp, dto.NewPassword);
        if (!success)
            return BadRequest(new { message = error });

        var user = await _userManager.FindByEmailAsync(dto.Email.Trim());
        if (user != null)
            await _refreshTokens.RevokeAllForUserAsync(user.Id);

        return Ok(new { message = "Wagwoord is herstel. Jy kan nou aanmeld." });
    }

    [Authorize]
    [HttpPost("complete-required-password-change")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> CompleteRequiredPasswordChange([FromBody] CompleteRequiredPasswordChangeDto dto)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();

        if (user.IsAnonymized)
            return Unauthorized();

        if (!user.MustChangePassword)
            return BadRequest(new { message = "Geen verpligte wagwoordverandering is nodig nie." });

        if (dto.NewPassword != dto.ConfirmPassword)
            return BadRequest(new { message = "Wagwoorde stem nie ooreen nie." });

        if (!PasswordValidator.IsValid(dto.NewPassword, out var passwordError))
            return BadRequest(new { message = passwordError });

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(result) });

        user.MustChangePassword = false;
        await _userManager.UpdateAsync(user);
        await _refreshTokens.RevokeAllForUserAsync(user.Id);

        var roles = await _userManager.GetRolesAsync(user);
        var jwt = GenerateJwtToken(user, roles);
        var refresh = await _refreshTokens.CreateAsync(user.Id);
        SetRefreshCookie(refresh.Token);

        return Ok(AuthPayload(jwt, user, roles));
    }

    private static object AuthPayload(string token, User user, IList<string> roles) => new
    {
        token,
        user.Email,
        user.FirstName,
        user.LastName,
        user.PhoneNumber,
        user.PhoneCountryCode,
        user.IsOraniaResident,
        user.IsOraniaBewegingMember,
        user.ReceiveBlockProgressEmails,
        user.MustChangePassword,
        roles
    };

    private static string FormatIdentityErrors(IdentityResult result)
    {
        foreach (var err in result.Errors)
        {
            if (err.Code.Contains("Password", StringComparison.OrdinalIgnoreCase))
                return "Wagwoord voldoen nie aan die vereistes nie (minstens 8 karakters, nommer, spesiale karakter, hoof- en kleinletter).";
            if (err.Code.Contains("Duplicate", StringComparison.OrdinalIgnoreCase))
                return "Hierdie e-posadres is reeds geregistreer.";
        }
        return result.Errors.FirstOrDefault()?.Description
            ?? "Registrasie het misluk. Kontroleer jou besonderhede en probeer weer.";
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
            new("IsOraniaResident", user.IsOraniaResident.ToString()),
            new("MustChangePassword", user.MustChangePassword.ToString())
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
