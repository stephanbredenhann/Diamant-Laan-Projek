using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

/// <summary>
/// Blocks bought for a road builder. Everything about a sponsorship lives on
/// <see cref="PurchaseSquare.StadsbouerId"/>: who is taken is derived from it rather than stored,
/// so a cancelled or expired reservation frees the builder again without any cleanup of its own.
/// </summary>
public class StadsbouerSponsorshipService
{
    public const string HoldingEmail = "stadsbouer-bewaring@diamantlaan.invalid";

    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly EmailOutboxService _emails;
    private readonly IConfiguration _config;
    private readonly LanguageLinkService? _languageLinks;
    private readonly ILogger<StadsbouerSponsorshipService> _logger;

    public StadsbouerSponsorshipService(
        AppDbContext db,
        UserManager<User> userManager,
        EmailOutboxService emails,
        IConfiguration config,
        ILogger<StadsbouerSponsorshipService> logger,
        LanguageLinkService? languageLinks = null)
    {
        _db = db;
        _userManager = userManager;
        _emails = emails;
        _config = config;
        _logger = logger;
        _languageLinks = languageLinks;
    }

    /// <summary>Builders already paid for, and those held by an unpaid purchase. Neither is selectable.</summary>
    public record Availability(HashSet<int> Sponsored, HashSet<int> Pending)
    {
        public bool IsTaken(int stadsbouerId) => Sponsored.Contains(stadsbouerId) || Pending.Contains(stadsbouerId);
    }

    /// <summary>Static so every caller reads availability the same way without taking the whole service.</summary>
    public static async Task<Availability> GetAvailabilityAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        var rows = await db.PurchaseSquares
            .Where(ps => ps.StadsbouerId != null
                && (ps.Purchase.PaymentStatus == PaymentStatus.Pending
                    || ps.Purchase.PaymentStatus == PaymentStatus.Confirmed))
            .Select(ps => new { Id = ps.StadsbouerId!.Value, ps.Purchase.PaymentStatus })
            .ToListAsync(cancellationToken);

        var sponsored = rows.Where(r => r.PaymentStatus == PaymentStatus.Confirmed).Select(r => r.Id).ToHashSet();
        var pending = rows.Where(r => r.PaymentStatus == PaymentStatus.Pending).Select(r => r.Id).ToHashSet();
        pending.ExceptWith(sponsored);

        return new Availability(sponsored, pending);
    }

    /// <summary>
    /// Hands a confirmed purchase's blocks to the builders they were bought for, creating their
    /// accounts if this is the first time. Safe to run twice: a block already owned by its builder
    /// is skipped, so a retried ITN cannot send a second email.
    /// </summary>
    public async Task AssignAsync(Purchase purchase, CancellationToken cancellationToken = default)
    {
        var rows = await _db.PurchaseSquares
            .Include(ps => ps.Stadsbouer)
            .Where(ps => ps.PurchaseId == purchase.Id && ps.StadsbouerId != null)
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
            return;

        foreach (var group in rows.GroupBy(ps => ps.StadsbouerId!.Value))
        {
            var builder = group.First().Stadsbouer;
            if (builder == null)
                continue;

            await HandOverAsync(builder, group.Select(ps => ps.SquareId).ToList(), cancellationToken);
        }
    }

    /// <summary>
    /// Retries the handover for a builder: moves blocks still with the holding account or the payer to
    /// the builder (or the holder if there is still no email). Idempotent: with nothing left to move it does nothing.
    /// </summary>
    public async Task ReleaseHeldAsync(int stadsbouerId, CancellationToken cancellationToken = default)
    {
        var builder = await _db.Stadsbouers.FindAsync(new object[] { stadsbouerId }, cancellationToken);
        if (builder == null)
            return;

        var holder = await _userManager.FindByEmailAsync(HoldingEmail);
        var holderId = holder?.Id;

        // Blocks still with the holder, or still with the payer because an earlier handover failed.
        var ids = await _db.PurchaseSquares
            .Where(ps => ps.StadsbouerId == stadsbouerId
                && ps.Purchase.PaymentStatus == PaymentStatus.Confirmed
                && (ps.Square.OwnerId == ps.Purchase.UserId || (holderId != null && ps.Square.OwnerId == holderId)))
            .Select(ps => ps.SquareId)
            .ToListAsync(cancellationToken);

        if (ids.Count > 0)
            await HandOverAsync(builder, ids, cancellationToken);
    }

    /// <summary>Moves the blocks to the builder, or to the holding account while they have no email.</summary>
    private async Task HandOverAsync(Stadsbouer builder, List<int> squareIds, CancellationToken cancellationToken)
    {
        var held = string.IsNullOrWhiteSpace(builder.Email);
        var (user, tempPassword) = held ? (await FindOrCreateHoldingUserAsync(), null) : await FindOrCreateAccountAsync(builder);
        if (user == null)
            return;

        var squares = await _db.Squares.Where(s => squareIds.Contains(s.Id)).ToListAsync(cancellationToken);

        var moved = new List<int>();
        foreach (var square in squares.Where(s => s.OwnerId != user.Id))
        {
            square.OwnerId = user.Id;
            square.CertificateName = builder.Name;
            moved.Add(square.Id);
        }

        if (moved.Count == 0)
            return;

        await _db.SaveChangesAsync(cancellationToken);

        if (held)
        {
            _logger.LogInformation(
                "Stadsbouer {StadsbouerId} has no email: {Count} block(s) held until one is added", builder.Id, moved.Count);
            return;
        }

        await SendSponsorshipEmailAsync(user, builder.Name, tempPassword, moved, cancellationToken);

        _logger.LogInformation("Handed {Count} block(s) to stadsbouer {StadsbouerId}", moved.Count, builder.Id);
    }

    /// <summary>A locked account with no password that owns blocks nobody can be emailed about yet.</summary>
    private async Task<User?> FindOrCreateHoldingUserAsync()
    {
        var existing = await _userManager.FindByEmailAsync(HoldingEmail);
        if (existing != null)
            return existing;

        var user = new User
        {
            UserName = HoldingEmail,
            Email = HoldingEmail,
            FirstName = "Stadsbouer",
            LastName = "Bewaring",
            EmailConfirmed = false,
            LockoutEnabled = true,
            LockoutEnd = DateTimeOffset.MaxValue,
            ReceiveBlockProgressEmails = false
        };

        var created = await _userManager.CreateAsync(user);
        if (!created.Succeeded)
        {
            // Lost a creation race: the other request's account is the one to use.
            var raced = await _userManager.FindByEmailAsync(HoldingEmail);
            if (raced != null)
                return raced;

            _logger.LogError("Could not create the stadsbouer holding account: {Errors}",
                string.Join("; ", created.Errors.Select(e => e.Description)));
            return null;
        }

        return user;
    }

    /// <summary>
    /// The same account shape a telefoniese aankoop creates: confirmed email, a temporary password
    /// and MustChangePassword, which the middleware makes inert until it is changed.
    /// </summary>
    private async Task<(User? User, string? TempPassword)> FindOrCreateAccountAsync(Stadsbouer builder)
    {
        var existing = await _userManager.FindByEmailAsync(builder.Email!);
        if (existing != null)
            return (existing, null);

        var name = builder.Name.Trim();
        var split = name.LastIndexOf(' ');
        var tempPassword = TemporaryPasswordGenerator.Generate();

        var user = new User
        {
            UserName = builder.Email!,
            Email = builder.Email!,
            FirstName = split > 0 ? name[..split] : name,
            LastName = split > 0 ? name[(split + 1)..] : string.Empty,
            EmailConfirmed = true,
            MustChangePassword = true,
            ReceiveBlockProgressEmails = true
        };

        var created = await _userManager.CreateAsync(user, tempPassword);
        if (!created.Succeeded)
        {
            _logger.LogError(
                "Could not create account for stadsbouer {StadsbouerId}: {Errors}",
                builder.Id, string.Join("; ", created.Errors.Select(e => e.Description)));
            return (null, null);
        }

        await _userManager.AddToRoleAsync(user, "Buyer");
        return (user, tempPassword);
    }

    /// <summary>
    /// Greets the builder by the whole name the admin captured. Splitting it into first and last
    /// for the account is a guess ("Jan van der" / "Merwe"), and a guess is not what to open with.
    /// </summary>
    private async Task SendSponsorshipEmailAsync(
        User user, string displayName, string? tempPassword, IReadOnlyCollection<int> blockIds, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
            return;

        try
        {
            var en = user.Language == "en";
            await _emails.QueueAsync(
                user.Email,
                EmailTemplates.SubjectPrefix + EmailTemplates.T(
                    en, "Iemand het ’n blokkie vir jou geborg!", "Someone sponsored a block for you!"),
                EmailTemplates.StadsbouerSponsorship(
                    displayName,
                    user.Email,
                    tempPassword,
                    blockIds,
                    AppPublicUrl.Resolve(_config),
                    en,
                    _languageLinks?.BuildUrl(user.Id, "en")),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // The block is already theirs. A failed email must not undo that or fail the ITN.
            _logger.LogError(ex, "Could not send sponsorship email to {UserId}", user.Id);
        }
    }
}
