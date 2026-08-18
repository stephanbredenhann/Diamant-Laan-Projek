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
    // Optional so a test can build the mailer without a signing key: without it the emails simply
    // go out without the switch-to-English footer link. Always supplied by DI in production.
    private readonly LanguageLinkService? _languageLinks;

    public ProfileController(
        UserManager<User> userManager,
        ProfileRateLimitService rateLimit,
        RefreshTokenService refreshTokens,
        LanguageLinkService? languageLinks = null)
    {
        _userManager = userManager;
        _rateLimit = rateLimit;
        _refreshTokens = refreshTokens;
        _languageLinks = languageLinks;
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
            user.Language,
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
        user.Language = NormaliseLanguage(dto.Language);

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { message = FormatIdentityErrors(result) });

        await _rateLimit.LogAsync(user.Id, ProfileChangeTypes.Profile);
        return await Get();
    }

    /// <summary>
    /// The one-click switch behind the link at the foot of every Afrikaans email. Anonymous on
    /// purpose: someone who cannot read the email is the last person we should send to a login
    /// form. The signature covers the account id and the target language together, so the link
    /// cannot be enumerated or edited into a different language.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("taal/{lang}")]
    public async Task<IActionResult> SwitchLanguage(string lang, [FromQuery] string u, [FromQuery] string s)
    {
        var target = NormaliseLanguage(lang);
        if (_languageLinks == null || string.IsNullOrWhiteSpace(u) || !_languageLinks.Verify(u, target, s))
            return NotFound();

        var user = await _userManager.FindByIdAsync(u);
        if (user == null || user.IsAnonymized)
            return NotFound();

        if (user.Language != target)
        {
            user.Language = target;
            await _userManager.UpdateAsync(user);
        }

        return Content(LanguageSwitchedPage(target), "text/html; charset=utf-8");
    }

    private static string NormaliseLanguage(string? lang) =>
        string.Equals(lang?.Trim(), "en", StringComparison.OrdinalIgnoreCase) ? "en" : "af";

    /// <summary>
    /// Deliberately a standalone page rather than a redirect into the SPA: /my-profiel is behind
    /// the auth guard, so redirecting there would bounce the reader to a login form and undo the
    /// whole point of a one-click link.
    /// </summary>
    private static string LanguageSwitchedPage(string lang)
    {
        var en = lang == "en";
        var heading = en ? "Done!" : "Klaar!";
        var body = en
            ? "All further communication will be sent to you in English. You can change this at any time under My Profile."
            : "Alle verdere kommunikasie sal voortaan in Afrikaans aan jou gestuur word. Jy kan dit enige tyd onder My Profiel verander.";
        return $"""
            <!doctype html>
            <html lang="{lang}">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="robots" content="noindex">
              <title>Orania Oewerpad</title>
            </head>
            <body style="margin:0; padding:48px 16px; background:#FDF8F0; font-family:'Source Sans 3',Helvetica,Arial,sans-serif; color:#1A1A1A;">
              <div style="max-width:520px; margin:0 auto; background:#FFFFFF; border:1px solid #D8D2C6; border-radius:4px; padding:36px;">
                <p style="margin:0 0 10px; font-size:14px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:#55606E;">Orania Oewerpad</p>
                <h1 style="margin:0 0 4px; font-size:34px; line-height:1.1; color:#19120E;">{heading}</h1>
                <div style="width:56px; height:4px; background:#F58220; margin:0 0 20px;"></div>
                <p style="margin:0; font-size:16px; line-height:1.6;">{body}</p>
              </div>
            </body>
            </html>
            """;
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
        user.ShareToken = null;
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
