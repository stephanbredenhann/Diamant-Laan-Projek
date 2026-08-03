using System.Net;
using System.Text;

namespace DiamantLaan.Api.Services;

public static class EmailTemplates
{
    public static string PasswordResetOtp(string firstName, string otp)
    {
        var name = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(firstName) ? "daar" : firstName);
        var code = WebUtility.HtmlEncode(otp);
        return $"""
            <div style="font-family: Arial, Helvetica, sans-serif; color: #1A1A1A; line-height: 1.6; max-width: 560px;">
              <h2 style="color: #034EA2; margin-bottom: 0.5rem;">Herstel jou wagwoord</h2>
              <p>Hallo {name},</p>
              <p>Gebruik hierdie kode om jou wagwoord te herstel. Dit is vir 15 minute lank geldig:</p>
              <p style="font-size: 1.75rem; letter-spacing: 0.25rem; font-weight: 700; color: #034EA2;">{code}</p>
              <p style="color: #6B7280; font-size: 0.875rem;">As jy nie hierdie versoek gemaak het nie, kan jy hierdie e-pos ignoreer.</p>
              <p style="margin-top: 1.5rem;">Diamant Laan</p>
            </div>
            """;
    }

    public static string ManualPurchaseWelcome(string firstName, string email, string tempPassword, string loginUrl)
    {
        var name = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(firstName) ? "daar" : firstName);
        var encodedEmail = WebUtility.HtmlEncode(email);
        var password = WebUtility.HtmlEncode(tempPassword);
        var url = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(loginUrl) ? "/" : loginUrl.TrimEnd('/') + "/meld-aan");
        return $"""
            <div style="font-family: Arial, Helvetica, sans-serif; color: #1A1A1A; line-height: 1.6; max-width: 560px;">
              <h2 style="color: #034EA2; margin-bottom: 0.5rem;">Welkom by die Diamant Laan Projek</h2>
              <p>Hallo {name},</p>
              <p>Jou aankoop is suksesvol verwerk. Ons het 'n rekening vir jou geskep met die e-posadres <strong>{encodedEmail}</strong>.</p>
              <p>Jou tydelike wagwoord is:</p>
              <p style="font-size: 1.5rem; letter-spacing: 0.15rem; font-weight: 700; color: #034EA2; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">{password}</p>
              <p style="color: #6B7280; font-size: 0.875rem;">Jy sal gevra word om jou wagwoord te verander wanneer jy vir die eerste keer aanmeld.</p>
              <p><a href="{url}" style="display:inline-block; background:#F58220; color:#1A1A1A; text-decoration:none; padding:0.6rem 1.1rem; border-radius:8px; font-weight:600;">Meld aan</a></p>
              <p style="color: #6B7280; font-size: 0.875rem; margin-top: 1.5rem;">As jy nie hierdie aankoop gemaak het nie, kontak ons asseblief.</p>
              <p style="margin-top: 1.5rem;">Diamant Laan</p>
            </div>
            """;
    }

    /// <summary>
    /// Sent once to a guest who paid without an account and left us an email address. The link
    /// carries a claim token, so following it can still turn the purchase into an account later.
    /// </summary>
    public static string GuestPurchaseClaim(int blockCount, decimal amount, string claimUrl, int validDays)
    {
        var url = WebUtility.HtmlEncode(claimUrl);
        var blocks = blockCount == 1 ? "blok" : "blokke";
        var total = amount.ToString("0", System.Globalization.CultureInfo.InvariantCulture);
        return $"""
            <div style="font-family: Arial, Helvetica, sans-serif; color: #1A1A1A; line-height: 1.6; max-width: 560px;">
              <h2 style="color: #034EA2; margin-bottom: 0.5rem;">Dankie vir jou bydrae tot Diamant Laan</h2>
              <p>Hallo daar,</p>
              <p>Jou betaling is bevestig. Jy het <strong>{blockCount}</strong> {blocks} geborg, R{total} in totaal.</p>
              <p>Jy het sonder 'n rekening gekoop. As jy later van plan verander, kan jy met hierdie skakel een skep en jou blokke daaraan koppel:</p>
              <p><a href="{url}" style="display:inline-block; background:#F58220; color:#1A1A1A; text-decoration:none; padding:0.6rem 1.1rem; border-radius:8px; font-weight:600;">Skep 'n rekening</a></p>
              <p>Met 'n rekening kan jy:</p>
              <ul>
                <li>Die vordering van elke blok volg, van nog nie begin nie tot klaar geteer</li>
                <li>Foto's sien van die werk op jou blokke</li>
                <li>Jou sertifikaat enige tyd weer aflaai</li>
                <li>Al jou aankope op een plek hou</li>
              </ul>
              <p style="color: #6B7280; font-size: 0.875rem;">Die skakel werk vir {validDays} dae. Jy hoef niks te doen as jy tevrede is soos jy is nie, jou bydrae bly staan.</p>
              <p style="margin-top: 1.5rem;">Diamant Laan</p>
            </div>
            """;
    }

    public static string BlockProgressSummary(
        string firstName,
        int totalBlocks,
        IReadOnlyDictionary<string, int> statusCounts,
        bool hasPhotos,
        string siteUrl)
    {
        var name = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(firstName) ? "daar" : firstName);
        var url = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(siteUrl) ? "/" : siteUrl.TrimEnd('/') + "/my-blokke");
        var sb = new StringBuilder();
        sb.Append($"""
            <div style="font-family: Arial, Helvetica, sans-serif; color: #1A1A1A; line-height: 1.6; max-width: 560px;">
              <h2 style="color: #034EA2; margin-bottom: 0.5rem;">Opdatering van jou Diamant Laan blokke</h2>
              <p>Hallo {name},</p>
              <p>Jy het <strong>{totalBlocks}</strong> {(totalBlocks == 1 ? "blok" : "blokke")}. Hier is die huidige status:</p>
              <ul>
            """);

        foreach (var (label, count) in statusCounts)
        {
            if (count <= 0) continue;
            sb.Append($"<li><strong>{count}</strong> — {WebUtility.HtmlEncode(label)}</li>");
        }

        sb.Append("</ul>");
        if (hasPhotos)
            sb.Append("<p>Daar is vorderingsfoto's beskikbaar. Besoek die webwerf om hulle te sien.</p>");
        else
            sb.Append("<p>Besoek die webwerf om die nuutste vordering op jou blokke te sien.</p>");

        sb.Append($"""
              <p><a href="{url}" style="display:inline-block; background:#F58220; color:#1A1A1A; text-decoration:none; padding:0.6rem 1.1rem; border-radius:8px; font-weight:600;">Sien My Blokke</a></p>
              <p style="color: #6B7280; font-size: 0.875rem; margin-top: 1.5rem;">Jy kan e-posse soos hierdie afskakel onder My Profiel.</p>
              <p>Diamant Laan</p>
            </div>
            """);

        return sb.ToString();
    }
}
