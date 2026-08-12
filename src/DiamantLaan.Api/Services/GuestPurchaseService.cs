using System.Security.Cryptography;
using System.Text;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

/// <summary>
/// Supports checking out without an account. A guest purchase is backed by a placeholder
/// ("shadow") user so that <see cref="Square.OwnerId"/> and <see cref="Purchase.UserId"/>
/// behave exactly as they do for a signed-in buyer; the guest holds a bearer token that lets
/// them poll, name and claim that one purchase.
/// </summary>
public class GuestPurchaseService
{
    /// <summary>Guest reservations expire sooner than signed-in ones, because nothing stops a script from making them.</summary>
    public static readonly TimeSpan ReservationExpiry = TimeSpan.FromMinutes(15);

    /// <summary>How many pending guest reservations one IP may hold at a time.</summary>
    public const int MaxPendingPerIp = 3;

    /// <summary>How long the link in the "create an account later" email keeps working.</summary>
    public static readonly TimeSpan ClaimTokenLifetime = TimeSpan.FromDays(90);

    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly ILogger<GuestPurchaseService> _logger;

    public GuestPurchaseService(AppDbContext db, UserManager<User> userManager, ILogger<GuestPurchaseService> logger)
    {
        _db = db;
        _userManager = userManager;
        _logger = logger;
    }

    /// <summary>Generates a new bearer token for a guest purchase. Only ever returned once.</summary>
    public static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Base64UrlEncode(bytes);
    }

    public static string Hash(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Base64UrlEncode(hash);
    }

    /// <summary>
    /// Loads a guest purchase by id, but only when <paramref name="token"/> matches either the
    /// checkout token or the still valid claim token from the follow-up email. Returns null for a
    /// wrong token as well as a missing purchase, so that callers answer 404 either way and
    /// purchase ids cannot be probed.
    /// </summary>
    public async Task<Purchase?> FindByTokenAsync(int purchaseId, string? token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == purchaseId, cancellationToken);

        if (purchase == null)
            return null;

        var candidate = Hash(token);

        if (Matches(candidate, purchase.GuestTokenHash))
            return purchase;

        var claimIsLive = purchase.ClaimTokenExpiresAt is DateTime expiry && expiry > DateTime.UtcNow;
        if (claimIsLive && Matches(candidate, purchase.ClaimTokenHash))
            return purchase;

        return null;
    }

    /// <summary>
    /// Issues the token that goes into the "create an account later" email. Returns null when one
    /// has already been issued, which keeps that email a once-off.
    /// </summary>
    public async Task<string?> IssueClaimTokenAsync(Purchase purchase, CancellationToken cancellationToken = default)
    {
        if (purchase.ClaimEmailSentAt != null)
            return null;

        var token = GenerateToken();
        purchase.ClaimTokenHash = Hash(token);
        purchase.ClaimTokenExpiresAt = DateTime.UtcNow.Add(ClaimTokenLifetime);
        purchase.ClaimEmailSentAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return token;
    }

    /// <summary>
    /// Retires both bearer tokens once the purchase belongs to a real account, so an old email
    /// link cannot reattach it later.
    /// </summary>
    private static void RetireTokens(Purchase purchase)
    {
        purchase.GuestTokenHash = null;
        purchase.ClaimTokenHash = null;
        purchase.ClaimTokenExpiresAt = null;
    }

    private static bool Matches(string candidateHash, string? storedHash)
    {
        if (string.IsNullOrEmpty(storedHash))
            return false;

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(candidateHash),
            Encoding.UTF8.GetBytes(storedHash));
    }

    /// <summary>Counts the pending guest reservations currently held by one IP.</summary>
    public Task<int> CountPendingForIpAsync(string ipHash, CancellationToken cancellationToken = default) =>
        _db.Purchases.CountAsync(
            p => p.GuestIpHash == ipHash
                 && p.GuestTokenHash != null
                 && p.PaymentStatus == PaymentStatus.Pending,
            cancellationToken);

    /// <summary>
    /// Creates the placeholder account that will own a guest purchase. It has no password,
    /// no roles and no email, so it cannot be signed into until it is claimed.
    /// </summary>
    public async Task<User> CreateShadowUserAsync()
    {
        var user = new User
        {
            UserName = $"gas-{Guid.NewGuid():N}",
            Email = null,
            FirstName = string.Empty,
            LastName = string.Empty,
            IsGuest = true,
            ReceiveBlockProgressEmails = false
        };

        var result = await _userManager.CreateAsync(user);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Could not create guest user: {errors}");
        }

        return user;
    }

    /// <summary>
    /// Sets the name that appears on a guest's certificate. Stored on the shadow user so the
    /// certificate renders from the same fields as a signed-in buyer's.
    /// </summary>
    public async Task SetCertificateNameAsync(Purchase purchase, string name, CancellationToken cancellationToken = default)
    {
        var user = purchase.User ?? await _db.Users.FirstAsync(u => u.Id == purchase.UserId, cancellationToken);
        var trimmed = name.Trim();
        var split = trimmed.LastIndexOf(' ');

        user.FirstName = split > 0 ? trimmed[..split] : trimmed;
        user.LastName = split > 0 ? trimmed[(split + 1)..] : string.Empty;

        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Turns the shadow user behind <paramref name="purchase"/> into a real account in place.
    /// Nothing moves: the purchase and its squares keep pointing at the same user id.
    /// </summary>
    public async Task<IdentityResult> UpgradeShadowUserAsync(Purchase purchase, RegistrationDetails details)
    {
        var user = await _userManager.FindByIdAsync(purchase.UserId);
        if (user == null || !user.IsGuest)
            return IdentityResult.Failed(new IdentityError { Description = "Hierdie aankoop is reeds aan ’n rekening gekoppel." });

        user.UserName = details.Email;
        user.Email = details.Email;
        user.FirstName = details.FirstName;
        user.LastName = details.LastName;
        user.PhoneNumber = details.PhoneNumber;
        user.PhoneCountryCode = details.PhoneCountryCode;
        user.IsOraniaResident = details.IsOraniaResident;
        user.IsOraniaBewegingMember = details.IsOraniaBewegingMember;
        user.ReceiveBlockProgressEmails = true;
        user.IsGuest = false;

        var update = await _userManager.UpdateAsync(user);
        if (!update.Succeeded)
            return update;

        var password = await _userManager.AddPasswordAsync(user, details.Password);
        if (!password.Succeeded)
            return password;

        await _userManager.AddToRoleAsync(user, "Buyer");

        RetireTokens(purchase);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Guest purchase {PurchaseId} upgraded to account {UserId}", purchase.Id, user.Id);
        return IdentityResult.Success;
    }

    /// <summary>
    /// Moves a guest purchase and its squares onto an account that already exists, then removes
    /// the shadow user. Safe to call twice: a purchase that no longer has a guest owner is a no-op.
    /// </summary>
    public async Task<bool> MergeIntoUserAsync(Purchase purchase, string targetUserId, CancellationToken cancellationToken = default)
    {
        if (purchase.UserId == targetUserId)
            return true;

        var shadowUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == purchase.UserId, cancellationToken);
        if (shadowUser == null || !shadowUser.IsGuest)
            return false;

        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var squareIds = purchase.PurchaseSquares.Select(ps => ps.SquareId).ToList();
                var squares = await _db.Squares
                    .Where(s => squareIds.Contains(s.Id) && s.OwnerId == shadowUser.Id)
                    .ToListAsync(cancellationToken);

                foreach (var square in squares)
                    square.OwnerId = targetUserId;

                purchase.UserId = targetUserId;
                RetireTokens(purchase);

                await _db.SaveChangesAsync(cancellationToken);

                // Only drop the shadow user once nothing points at it any more.
                var stillOwns = await _db.Squares.AnyAsync(s => s.OwnerId == shadowUser.Id, cancellationToken);
                var otherPurchases = await _db.Purchases.AnyAsync(p => p.UserId == shadowUser.Id, cancellationToken);

                if (!stillOwns && !otherPurchases)
                {
                    _db.Users.Remove(shadowUser);
                    await _db.SaveChangesAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "Guest purchase {PurchaseId} merged into existing account {UserId}", purchase.Id, targetUserId);
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Failed to merge guest purchase {PurchaseId}", purchase.Id);
                return false;
            }
        });
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public record RegistrationDetails(
        string Email,
        string Password,
        string FirstName,
        string LastName,
        string? PhoneNumber,
        string PhoneCountryCode,
        bool IsOraniaResident,
        bool IsOraniaBewegingMember);
}
