using System.Net;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Services;

public static class EmailTemplates
{
    /// <summary>Prefix every subject line carries, so the whole set reads as one sender.</summary>
    public const string SubjectPrefix = "Orania Oewerpad: ";

    public static string PasswordResetOtp(string firstName, string otp)
    {
        var code = WebUtility.HtmlEncode(otp);
        return Shell(
            "Herstel jou wagwoord",
            firstName,
            $"""
              <p>Gebruik die eenmalige wagwoord (OTP) hieronder om jou wagwoord te herstel:</p>
              <p style="font-size: 1.75rem; letter-spacing: 0.25rem; font-weight: 700; color: #034EA2;">{code}</p>
              <p style="color: #6B7280; font-size: 0.875rem;">Hierdie kode is slegs vir ’n beperkte tyd geldig. Indien jy nie hierdie versoek gerig het nie, kan jy hierdie e-pos ignoreer.</p>
            """);
    }

    public static string ManualPurchaseWelcome(string firstName, string email, string tempPassword, string loginUrl)
    {
        var encodedEmail = WebUtility.HtmlEncode(email);
        var password = WebUtility.HtmlEncode(tempPassword);
        var url = LoginUrl(loginUrl);
        return Shell(
            "Jou borgskap is voltooi!",
            firstName,
            $"""
              <p>Jou aankoop is suksesvol verwerk en ons het ’n rekening vir jou geskep met die e-posadres <strong>{encodedEmail}</strong>.</p>
              <p>Jou tydelike wagwoord:</p>
              <p style="font-size: 1.5rem; letter-spacing: 0.15rem; font-weight: 700; color: #034EA2; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">{password}</p>
              <p>Meld aan by <a href="{url}" style="color: #034EA2;">{url}</a>. Jy sal gevra word om jou wagwoord te verander wanneer jy die eerste keer aanmeld.</p>
              {Button(url, "Meld aan")}
            """);
    }

    /// <summary>
    /// Sent once to a guest who paid without an account and left us an email address. The link
    /// carries a claim token, so following it can still turn the purchase into an account later.
    /// </summary>
    public static string GuestPurchaseClaim(int blockCount, decimal amount, string claimUrl, int validDays)
    {
        var url = WebUtility.HtmlEncode(claimUrl);
        return Shell(
            "Jou borgskap is voltooi!",
            "Stadsbouer",
            $"""
              {PaymentConfirmedLine(blockCount, amount)}
              <p>Jy het sonder ’n rekening bygedra. Indien jy later ’n rekening wil skep, kan jy dit met die onderstaande skakel doen en jou blokke daaraan koppel:</p>
              {Button(url, "Skep ’n rekening")}
              <p>Met ’n rekening kan jy:</p>
              <ul>
                <li>Die vordering van jou m² aktief volg.</li>
                <li>Foto’s sien van hoe die werk vorder.</li>
                <li>Opdaterings oor die vordering ontvang.</li>
                <li>Enige tyd toegang tot jou digitale sertifikaat kry.</li>
                <li>Kwitansies van jou borgskap aflaai.</li>
                <li>Later weer m² borg sonder om deur die hele proses te gaan.</li>
              </ul>
              <p style="color: #6B7280; font-size: 0.875rem;">Die skakel werk vir {validDays} dae.</p>
            """);
    }

    /// <summary>Confirmation for a buyer who already had an account, so there is nothing to claim.</summary>
    public static string AccountPurchaseConfirmation(string firstName, int blockCount, decimal amount, string siteUrl)
    {
        var url = LoginUrl(siteUrl);
        var name = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(firstName) ? "Stadsbouer" : firstName);
        return Shell(
            "Jou borgskap is voltooi!",
            firstName,
            $"""
              {PaymentConfirmedLine(blockCount, amount)}
              <p>Jou borgskap is nou aan jou rekening gekoppel. Jy kan enige tyd aanmeld om jou borgskap en die vordering van jou m² te volg.</p>
              <p>Ons stuur vir jou ’n opdatering as daar aan jou blokkie m² begin werk word.</p>
              {Button(url, "Meld aan")}
              <p>Baie dankie vir jou bydrae tot die Oewerpad, {name}!</p>
            """);
    }

    /// <summary>
    /// One email per status a batch of the owner's blocks moved into. Returns null for
    /// <see cref="SquareStatus.NogNieBeginNie"/>, which is not worth telling anyone about.
    /// </summary>
    public static (string Subject, string Html)? BlockStatusUpdate(
        string firstName,
        SquareStatus status,
        IReadOnlyCollection<int> blockIds,
        string siteUrl)
    {
        if (blockIds.Count == 0) return null;

        var name = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(firstName) ? "Stadsbouer" : firstName);
        var blocks = blockIds.Count == 1 ? "blok" : "blokke";
        var numbers = string.Join(", ", blockIds.OrderBy(id => id).Select(id => $"#{id}"));
        var url = WebUtility.HtmlEncode(Site(siteUrl) + "/my-blokke");

        // The heading and the subject are deliberately the same line, so the inbox preview and the
        // opened email say the same thing.
        (string Subject, string Body)? parts = status switch
        {
            SquareStatus.Voorberei => (
                "Beweging op jou blokkie!",
                $"""
                  <p>Die bal is aan die rol!</p>
                  <p>Jou {blocks} <strong>{numbers}</strong> word tans voorberei om geteer te word. Dit beteken dat jou {blocks} nou ’n stap nader is aan ’n voltooide pad.</p>
                  <p>Jy help ons om van hierdie projek ’n sukses te maak. Ons hou jou op hoogte van die vordering!</p>
                """),
            SquareStatus.BesigOmTeTeer => (
                "Jou blokkie word geteer!",
                $"""
                  <p>Ons is tans besig om jou {blocks} <strong>{numbers}</strong> te teer! Die werk aan jou gedeelte van die pad is nou in volle gang.</p>
                  <p>Baie dankie, {name}. Ons waardeer jou ondersteuning en hou jou op hoogte soos die werk verder vorder.</p>
                """),
            SquareStatus.KlaarGeteer => (
                "Teerwerk op jou blokkie is voltooi!",
                $"""
                  <p>Te danke aan jou bydrae is die teerpad op {blocks} <strong>{numbers}</strong> nou ’n werklikheid. Jy kan jouself met trots ’n volwaardige Stadsbouer noem!</p>
                  <p>Wat eens net ’n stuk grondpad was, is nou ’n voltooide gedeelte van die Oewerpad. Jou bydrae het gehelp om hierdie belangrike infrastruktuurprojek ’n werklikheid te maak.</p>
                  <p>Hierdie pad sal nog vir jare deur Oraniërs en besoekers gebruik word, en jy kan weet dat jy gehelp het om dit moontlik te maak. Projekte soos dié is die bewys van wat moontlik is wanneer ons kragte saamspan.</p>
                  <p>Kom kyk gerus hoe lyk die nuwe Afrikanerpad in Orania!</p>
                """),
            _ => null
        };

        if (parts is null) return null;
        var (subject, body) = parts.Value;

        var html = Shell(
            subject,
            firstName,
            $"""
              {body}
              {Button(url, "Sien my blokke")}
              <p style="color: #6B7280; font-size: 0.875rem;">Jy kan e-posse soos hierdie afskakel onder My Profiel.</p>
            """);

        return (SubjectPrefix + subject, html);
    }

    private static string PaymentConfirmedLine(int blockCount, decimal amount)
    {
        var blocks = blockCount == 1 ? "blok" : "blokke";
        var total = amount.ToString("0", System.Globalization.CultureInfo.InvariantCulture);
        return $"<p>Jou betaling is bevestig. Jy het <strong>{blockCount}</strong> {blocks} geborg, ter waarde van R{total} in totaal.</p>";
    }

    private static string Button(string encodedUrl, string label) =>
        $"""<p><a href="{encodedUrl}" style="display:inline-block; background:#F58220; color:#1A1A1A; text-decoration:none; padding:0.6rem 1.1rem; border-radius:8px; font-weight:600;">{label}</a></p>""";

    private static string Site(string siteUrl) =>
        string.IsNullOrWhiteSpace(siteUrl) ? "" : siteUrl.TrimEnd('/');

    private static string LoginUrl(string siteUrl) =>
        WebUtility.HtmlEncode(Site(siteUrl) + "/meld-aan");

    private static string Shell(string heading, string firstName, string body)
    {
        var name = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(firstName) ? "Stadsbouer" : firstName);
        return $"""
            <div style="font-family: Arial, Helvetica, sans-serif; color: #1A1A1A; line-height: 1.6; max-width: 560px;">
              <h2 style="color: #034EA2; margin-bottom: 0.5rem;">{WebUtility.HtmlEncode(heading)}</h2>
              <p>Beste {name}!</p>
            {body}
              <p style="margin-top: 1.5rem;">Orania groete,<br>Die Orania Beweging-span</p>
            </div>
            """;
    }
}
