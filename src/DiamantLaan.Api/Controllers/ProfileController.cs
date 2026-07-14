using System.Security.Claims;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
using DiamantLaan.Api.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("profile")]
public class ProfileController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly ProfileRateLimitService _rateLimit;
    private readonly RefreshTokenService _refreshTokens;

    public ProfileController(
        UserManager<User> userManager,
        ProfileRateLimitService rateLimit,
        RefreshTokenService refreshTokens)
    {
        _userManager = userManager;
        _rateLimit = rateLimit;
        _refreshTokens = refreshTokens;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var (allowed, remaining, resetsAt) = await _rateLimit.CheckAsync(user.Id);
        var (countryCode, localPhone) = PhoneValidator.SplitE164(user.PhoneNumber, user.PhoneCountryCode);

        return Ok(new
        {
            user.Email,
            user.FirstName,
            user.LastName,
            phoneNumber = localPhone,
            phoneCountryCode = countryCode,
            user.IsOraniaResident,
            user.IsOraniaBewegingMember,
            user.ReceiveBlockProgressEmails,
            changesRemaining = remaining,
            changesAllowed = allowed,
            windowResetsAt = resetsAt,
            maxChanges = ProfileRateLimitService.MaxChanges
        });
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateProfileDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var rate = await EnsureRateLimitAsync(user.Id);
        if (rate != null) return rate;

        if (!PhoneValidator.TryNormalize(dto.PhoneNumber, dto.PhoneCountryCode, out var e164, out var phoneError))
            return BadRequest(new { message = phoneError });

        user.FirstName = dto.FirstName.Trim();
        user.LastName = dto.LastName.Trim();
        user.PhoneCountryCode = string.IsNullOrWhiteSpace(dto.PhoneCountryCode) ? "+27" : dto.PhoneCountryCode.Trim();
        user.PhoneNumber = string.IsNullOrEmpty(e164) ? null : e164;
        user.ReceiveBlockProgressEmails = dto.ReceiveBlockProgressEmails;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(result) });

        await _rateLimit.LogAsync(user.Id, ProfileChangeTypes.Profile);
        return await Get();
    }

    [HttpPut("email")]
    public async Task<IActionResult> UpdateEmail([FromBody] UpdateEmailDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var rate = await EnsureRateLimitAsync(user.Id);
        if (rate != null) return rate;

        if (!EmailValidator.IsValid(dto.Email, out var emailError))
            return BadRequest(new { message = emailError });

        if (!await _userManager.CheckPasswordAsync(user, dto.CurrentPassword))
            return BadRequest(new { message = "Huidige wagwoord is verkeerd." });

        var newEmail = dto.Email.Trim();
        if (string.Equals(user.Email, newEmail, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Dit is reeds jou e-posadres." });

        var existing = await _userManager.FindByEmailAsync(newEmail);
        if (existing != null && existing.Id != user.Id)
            return BadRequest(new { message = "Hierdie e-posadres word reeds gebruik." });

        var setEmail = await _userManager.SetEmailAsync(user, newEmail);
        if (!setEmail.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(setEmail) });

        var setUserName = await _userManager.SetUserNameAsync(user, newEmail);
        if (!setUserName.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(setUserName) });

        await _refreshTokens.RevokeAllForUserAsync(user.Id);
        await _rateLimit.LogAsync(user.Id, ProfileChangeTypes.Email);

        return Ok(new { message = "E-posadres is opgedateer. Meld asseblief weer aan.", email = newEmail });
    }

    [HttpPut("password")]
    public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var rate = await EnsureRateLimitAsync(user.Id);
        if (rate != null) return rate;

        if (dto.NewPassword != dto.ConfirmPassword)
            return BadRequest(new { message = "Wagwoorde stem nie ooreen nie." });

        if (!PasswordValidator.IsValid(dto.NewPassword, out var passwordError))
            return BadRequest(new { message = passwordError });

        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(result) });

        await _refreshTokens.RevokeAllForUserAsync(user.Id);
        await _rateLimit.LogAsync(user.Id, ProfileChangeTypes.Password);

        return Ok(new { message = "Wagwoord is verander. Meld asseblief weer aan." });
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        if (user.IsAnonymized)
            return BadRequest(new { message = "Hierdie rekening is reeds gedeaktiveer." });

        if (await _userManager.IsInRoleAsync(user, "Admin"))
            return BadRequest(new { message = "Admin-rekeninge kan nie self verwyder word nie." });

        if (!await _userManager.CheckPasswordAsync(user, dto.CurrentPassword))
            return BadRequest(new { message = "Huidige wagwoord is verkeerd." });

        var anonymizedEmail = $"deleted-{user.Id}@anonymized.invalid";
        user.IsAnonymized = true;
        user.AnonymizedAt = DateTime.UtcNow;
        user.FirstName = "Onaktiewe";
        user.LastName = "rekening";
        user.PhoneNumber = null;
        user.PhoneCountryCode = "+27";
        user.ReceiveBlockProgressEmails = false;
        user.MustChangePassword = false;
        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;

        var setEmail = await _userManager.SetEmailAsync(user, anonymizedEmail);
        if (!setEmail.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(setEmail) });

        var setUserName = await _userManager.SetUserNameAsync(user, anonymizedEmail);
        if (!setUserName.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(setUserName) });

        var update = await _userManager.UpdateAsync(user);
        if (!update.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(update) });

        await _userManager.UpdateSecurityStampAsync(user);
        await _refreshTokens.RevokeAllForUserAsync(user.Id);

        return Ok(new { message = "Jou rekening is gedeaktiveer." });
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return null;
        return await _userManager.FindByIdAsync(userId);
    }

    private async Task<IActionResult?> EnsureRateLimitAsync(string userId)
    {
        var (allowed, _, _) = await _rateLimit.CheckAsync(userId);
        if (allowed) return null;
        return StatusCode(StatusCodes.Status429TooManyRequests, new
        {
            message = "Jy mag net 3 profielveranderinge elke 12 uur maak."
        });
    }

    private static string FormatIdentityErrors(IdentityResult result)
    {
        var first = result.Errors.FirstOrDefault()?.Description;
        return string.IsNullOrWhiteSpace(first)
            ? "Profielopdatering het misluk."
            : TranslateIdentityError(first);
    }

    private static string TranslateIdentityError(string description)
    {
        if (description.Contains("Password", StringComparison.OrdinalIgnoreCase))
            return "Wagwoord voldoen nie aan die vereistes nie.";
        if (description.Contains("Incorrect password", StringComparison.OrdinalIgnoreCase))
            return "Huidige wagwoord is verkeerd.";
        return description;
    }
}
