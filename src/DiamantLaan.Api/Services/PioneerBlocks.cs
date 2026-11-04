using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

/// <summary>
/// The "padbou pionier" blocks: everything bought while the fund stood at or under its first
/// million rand. Those certificates print on the pioneer plate, with the gold seal; every block
/// sold after the line keeps the standard one. This is the only place that decides it, so every
/// certificate surface (the buyer's page, the share link, the guest flow and the admin downloads)
/// agrees on who qualifies.
///
/// The rule is per purchase, not per person: someone who bought before the line and again after
/// it holds pioneer blocks from the first purchase and standard blocks from the second.
///
/// Nothing is stored. The set is walked fresh on every certificate request, which costs one
/// narrow query over the confirmed purchases and keeps a late confirmation or a cancelled sale
/// from leaving a stale flag behind.
/// </summary>
public static class PioneerBlocks
{
    /// <summary>
    /// R1 000 000 at R500 a block. The purchase that crosses the line counts in full: it was
    /// bought "on" the million, and splitting one checkout across two designs would read as a
    /// mistake on the buyer's certificates.
    /// </summary>
    public const int PioneerBlockCount = 1_000_000 / 500;

    /// <summary>
    /// The confirmed purchases that qualify. Purchases are taken in the order the money landed
    /// (<c>ConfirmedAt</c>, or the purchase date for older rows that never recorded one), ties
    /// broken by id, and one qualifies while fewer than <paramref name="threshold"/> paid blocks
    /// came before it. Pending and cancelled purchases never count, either way.
    /// </summary>
    /// <param name="threshold">Overridable for tests, so they need not seed two thousand blocks.</param>
    public static async Task<HashSet<int>> PurchaseIdsAsync(
        AppDbContext db, int threshold = PioneerBlockCount, CancellationToken ct = default)
    {
        var purchases = await db.Purchases.AsNoTracking()
            .Where(p => p.PaymentStatus == PaymentStatus.Confirmed)
            .Select(p => new { p.Id, At = p.ConfirmedAt ?? p.PurchaseDate, Blocks = p.PurchaseSquares.Count })
            .ToListAsync(ct);

        var qualifying = new HashSet<int>();
        var before = 0;
        foreach (var purchase in purchases.OrderBy(p => p.At).ThenBy(p => p.Id))
        {
            if (before >= threshold) break;
            qualifying.Add(purchase.Id);
            before += purchase.Blocks;
        }

        return qualifying;
    }

    /// <summary>
    /// Which of <paramref name="squareIds"/> came from a qualifying purchase. Callers pass the
    /// blocks one certificate set covers, so only their own purchase rows are read.
    /// </summary>
    public static async Task<HashSet<int>> AmongAsync(
        AppDbContext db, IEnumerable<int> squareIds, int threshold = PioneerBlockCount, CancellationToken ct = default)
    {
        var ids = squareIds.Distinct().ToList();
        if (ids.Count == 0) return [];

        var pioneerPurchases = await PurchaseIdsAsync(db, threshold, ct);
        if (pioneerPurchases.Count == 0) return [];

        var rows = await db.PurchaseSquares.AsNoTracking()
            .Where(ps => ids.Contains(ps.SquareId) && ps.Purchase.PaymentStatus == PaymentStatus.Confirmed)
            .Select(ps => new { ps.SquareId, ps.PurchaseId })
            .ToListAsync(ct);

        return rows
            .Where(r => pioneerPurchases.Contains(r.PurchaseId))
            .Select(r => r.SquareId)
            .ToHashSet();
    }
}
