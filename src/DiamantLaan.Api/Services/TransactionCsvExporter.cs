using System.Globalization;
using System.Text;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Services;

/// <summary>
/// Writes every purchase as one CSV row for the admin's bookkeeping. Excel is the expected reader,
/// so the file starts with a UTF-8 BOM (otherwise names like "Müller" come out garbled) and text
/// cells that look like a formula are defused.
/// </summary>
public static class TransactionCsvExporter
{
    // South Africa has no daylight saving, so a fixed offset is exact and avoids depending on the
    // host having tz data installed.
    private static readonly TimeSpan Sast = TimeSpan.FromHours(2);

    private static readonly string[] Headers =
    {
        "Aankoop #",
        "Datum (SAST)",
        "Bevestig op (SAST)",
        "Gekanselleer op (SAST)",
        "Koper",
        "E-pos",
        "Bron",
        "Betaalmetode",
        "Status",
        "PayFast-status",
        "PayFast-betaling-ID",
        "Aantal blokke",
        "Bedrag per blok",
        "Totaal",
        "Blok-ID's",
        "Stadsbouers",
        "Bewys van betaling"
    };

    /// <summary>Expects <see cref="Purchase.User"/> and each square's <see cref="PurchaseSquare.Stadsbouer"/> to be loaded.</summary>
    public static byte[] Build(IEnumerable<Purchase> purchases)
    {
        var sb = new StringBuilder();
        AppendRow(sb, Headers);

        foreach (var purchase in purchases)
        {
            var dto = PurchaseTransactionMapper.ToDto(purchase, includeUser: true);
            var stadsbouers = purchase.PurchaseSquares
                .Where(ps => ps.Stadsbouer != null)
                .Select(ps => ps.Stadsbouer!.Name)
                .Distinct()
                .OrderBy(n => n);

            AppendRow(sb, new[]
            {
                dto.Id.ToString(CultureInfo.InvariantCulture),
                FormatDate(purchase.PurchaseDate),
                FormatDate(purchase.ConfirmedAt),
                FormatDate(purchase.CancelledAt),
                Text(dto.UserName),
                Text(dto.UserEmail),
                dto.PurchaseSource == "TelefonieseAankoop" ? "Telefoniese aankoop" : "PayFast",
                Text(dto.PaymentMethod),
                StatusLabel(purchase.PaymentStatus),
                Text(purchase.PayFastPaymentStatus),
                Text(dto.PayFastPaymentId),
                dto.SquareCount.ToString(CultureInfo.InvariantCulture),
                FormatAmount(dto.AmountPerBlock),
                FormatAmount(dto.Amount),
                string.Join(", ", dto.SquareIds),
                Text(string.Join("; ", stadsbouers)),
                dto.HasProof ? "Ja" : "Nee"
            });
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(sb.ToString());
        return preamble.Concat(body).ToArray();
    }

    private static string StatusLabel(PaymentStatus status) => status switch
    {
        PaymentStatus.Confirmed => "Bevestig",
        PaymentStatus.Pending => "Hangend",
        PaymentStatus.Cancelled => "Gekanselleer",
        PaymentStatus.Failed => "Misluk",
        _ => status.ToString()
    };

    private static string FormatDate(DateTime? utc) =>
        utc.HasValue
            ? DateTime.SpecifyKind(utc.Value, DateTimeKind.Utc).Add(Sast).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture)
            : string.Empty;

    private static string FormatAmount(decimal amount) =>
        amount.ToString("0.00", CultureInfo.InvariantCulture);

    /// <summary>
    /// Buyer-supplied text could start with = + - @ and run as a formula when opened in Excel, so
    /// such cells get a leading apostrophe and stay plain text.
    /// </summary>
    private static string Text(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;
        return value[0] is '=' or '+' or '-' or '@' or '\t' or '\r' ? "'" + value : value;
    }

    private static void AppendRow(StringBuilder sb, IEnumerable<string> cells)
    {
        sb.AppendJoin(',', cells.Select(Quote));
        sb.Append("\r\n");
    }

    private static string Quote(string cell) =>
        cell.IndexOfAny(new[] { ',', '"', '\r', '\n' }) >= 0
            ? "\"" + cell.Replace("\"", "\"\"") + "\""
            : cell;
}
