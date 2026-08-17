using System.Net;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Services;

public static class EmailTemplates
{
    /// <summary>Prefix every subject line carries, so the whole set reads as one sender.</summary>
    public const string SubjectPrefix = "Orania Oewerpad: ";

    // The site's tokens from styles.scss, restated here because an email carries no
    // stylesheet. Keep them in step with :root if the palette ever moves.
    private const string Tar = "#19120E";
    private const string Ink = "#1A1A1A";
    private const string Action = "#F58220";
    private const string BgWarm = "#FDF8F0";
    private const string BgChalk = "#F9F3E8";
    private const string BorderSoft = "#D8D2C6";
    private const string Muted = "#55606E";

    // Web fonts do not load in Outlook or the Gmail app, so both stacks name the
    // fallback the site itself falls back to. Barlow Condensed degrades to Arial
    // Narrow, which keeps the condensed heading proportions.
    private const string FontDisplay = "'Barlow Condensed','Arial Narrow',Arial,Helvetica,sans-serif";
    private const string FontBody = "'Source Sans 3','Source Sans Pro',Helvetica,Arial,sans-serif";

    public static string PasswordResetOtp(string firstName, string otp)
    {
        var code = WebUtility.HtmlEncode(otp);
        return Shell(
            "Herstel jou wagwoord",
            firstName,
            $"""
              <p style="margin:0 0 16px;">Gebruik die eenmalige wagwoord (OTP) hieronder om jou wagwoord te herstel:</p>
              {CodePanel(code)}
              {Fine("Hierdie kode is slegs vir ’n beperkte tyd geldig. Indien jy nie hierdie versoek gerig het nie, kan jy hierdie e-pos ignoreer.")}
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
              <p style="margin:0 0 16px;">Jou aankoop is suksesvol verwerk en ons het ’n rekening vir jou geskep met die e-posadres <strong>{encodedEmail}</strong>.</p>
              <p style="margin:0 0 12px;">Jou tydelike wagwoord:</p>
              {CodePanel(password, mono: true)}
              <p style="margin:16px 0 0;">Meld aan by <a href="{url}" style="color:#034EA2;">{url}</a>. Jy sal gevra word om jou wagwoord te verander wanneer jy die eerste keer aanmeld.</p>
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
              <p style="margin:0 0 16px;">Jy het sonder ’n rekening bygedra. Indien jy later ’n rekening wil skep, kan jy dit met die onderstaande skakel doen en jou blokke daaraan koppel:</p>
              {Button(url, "Skep ’n rekening")}
              <p style="margin:0 0 12px;">Met ’n rekening kan jy:</p>
              {List(
                "Die vordering van jou m² aktief volg.",
                "Foto’s sien van hoe die werk vorder.",
                "Opdaterings oor die vordering ontvang.",
                "Enige tyd toegang tot jou digitale sertifikaat kry.",
                "Kwitansies van jou borgskap aflaai.",
                "Later weer m² borg sonder om deur die hele proses te gaan.")}
              {Fine($"Die skakel werk vir {validDays} dae.")}
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
              <p style="margin:0 0 16px;">Jou borgskap is nou aan jou rekening gekoppel. Jy kan enige tyd aanmeld om jou borgskap en die vordering van jou m² te volg.</p>
              <p style="margin:0;">Ons stuur vir jou ’n opdatering as daar aan jou blokkie m² begin werk word.</p>
              {Button(url, "Meld aan")}
              <p style="margin:0;">Baie dankie vir jou bydrae tot die Oewerpad, {name}!</p>
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
                "Vordering op jou blokkie!",
                $"""
                  <p style="margin:0 0 16px;">Die bal is aan die rol!</p>
                  <p style="margin:0 0 16px;">Jou {blocks} <strong>{numbers}</strong> word tans voorberei om geteer te word. Dit beteken dat jou {blocks} nou ’n tree nader aan die voltooide pad is.</p>
                  <p style="margin:0;">Jy help ons om van hierdie projek ’n sukses te maak. Ons hou jou op hoogte van die vordering!</p>
                """),
            SquareStatus.BesigOmTeTeer => (
                "Jou blokkie word geteer!",
                $"""
                  <p style="margin:0 0 16px;">Ons is tans besig om jou {blocks} <strong>{numbers}</strong> te teer! Die werk aan jou gedeelte van die pad is nou in volle gang.</p>
                  <p style="margin:0;">Baie dankie, {name}. Ons waardeer jou ondersteuning en hou jou op hoogte soos die werk verder vorder.</p>
                """),
            SquareStatus.KlaarGeteer => (
                "Teerwerk op jou blokkie is voltooi!",
                $"""
                  <p style="margin:0 0 16px;">Te danke aan jou bydrae is die teerpad op {blocks} <strong>{numbers}</strong> nou ’n werklikheid. Jy kan jouself met trots ’n volwaardige Stadsbouer noem!</p>
                  <p style="margin:0 0 16px;">Wat eens net ’n stuk grondpad was, is nou ’n voltooide gedeelte van die Oewerpad. Jou bydrae het gehelp om hierdie belangrike infrastruktuurprojek ’n werklikheid te maak.</p>
                  <p style="margin:0 0 16px;">Hierdie pad sal nog vir jare deur Oraniërs en besoekers gebruik word, en jy kan weet dat jy gehelp het om dit moontlik te maak. Projekte soos dié is die bewys van wat moontlik is wanneer ons kragte saamspan.</p>
                  <p style="margin:0;">Kom kyk gerus hoe die nuwe Afrikanerpad in Orania lyk!</p>
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
              {BlockProgressOptOutFine(siteUrl)}
            """);

        return (SubjectPrefix + subject, html);
    }

    /// <summary>Opt-out line appended to every block status update email.</summary>
    private static string BlockProgressOptOutFine(string siteUrl)
    {
        var profileUrl = WebUtility.HtmlEncode(Site(siteUrl) + "/my-profiel");
        return Fine($"Jy kan e-posse soos hierdie onder <a href=\"{profileUrl}\" style=\"color:#034EA2;\">My Profiel</a> afskakel.");
    }

    private static string PaymentConfirmedLine(int blockCount, decimal amount)
    {
        var blocks = blockCount == 1 ? "blok" : "blokke";
        return $"""<p style="margin:0 0 16px;">Jou betaling is bevestig. Jy het <strong>{blockCount}</strong> {blocks} ter waarde van <strong>{Rand(amount)}</strong> in totaal geborg.</p>""";
    }

    /// <summary>
    /// Matches randBedrag/nommer on the front end: a space as the thousands separator,
    /// so the same amount does not read as R1500 in the inbox and R1 500 on the site.
    /// </summary>
    private static string Rand(decimal amount)
    {
        var grouped = Math.Round(amount, MidpointRounding.AwayFromZero)
            .ToString("#,##0", System.Globalization.CultureInfo.InvariantCulture)
            .Replace(",", " ");
        return $"R{grouped}";
    }

    /// <summary>
    /// A one-off value the reader has to copy out: the chalk panel the site uses for
    /// the same job, sized so the characters stay separable at a glance.
    /// </summary>
    private static string CodePanel(string encodedValue, bool mono = false)
    {
        var family = mono
            ? "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace"
            : FontDisplay;
        var size = mono ? "24px" : "32px";
        return $"""
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
              <tr>
                <td style="background:{BgChalk}; border:1px solid {BorderSoft}; border-radius:4px; padding:16px 24px; font-family:{family}; font-size:{size}; font-weight:700; letter-spacing:4px; color:{Tar};">{encodedValue}</td>
              </tr>
            </table>
            """;
    }

    /// <summary>
    /// Bullets drawn as table rows. Gmail and Outlook both reset ul padding to their
    /// own defaults, so a real list indents differently in every inbox.
    /// </summary>
    private static string List(params string[] items)
    {
        var rows = string.Concat(items.Select(item => $"""
            <tr>
              <td valign="top" style="padding:0 10px 8px 0; color:{Action}; font-weight:700; line-height:1.6;">&bull;</td>
              <td valign="top" style="padding:0 0 8px; line-height:1.6;">{item}</td>
            </tr>
            """));
        return $"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">{rows}</table>""";
    }

    /// <summary>
    /// Dark label on orange, not white: white on #F58220 lands near 2.9:1, well under
    /// the contrast floor, while the dark ink clears 8:1. The padding sits on the anchor
    /// so the whole block stays clickable in clients that ignore display:inline-block.
    /// </summary>
    private static string Button(string encodedUrl, string label) =>
        $"""
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
          <tr>
            <td style="background:{Action}; border-radius:4px;">
              <a href="{encodedUrl}" style="display:inline-block; padding:14px 28px; font-family:{FontDisplay}; font-size:17px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:{Tar}; text-decoration:none;">{label}</a>
            </td>
          </tr>
        </table>
        """;

    /// <summary>A rule the width of the one under every heading on the site.</summary>
    private static string Rule() =>
        $"""
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;">
          <tr><td style="width:56px; height:4px; background:{Action}; font-size:0; line-height:0;">&nbsp;</td></tr>
        </table>
        """;

    /// <summary>Small print, in the site's muted grey rather than a one-off hex.</summary>
    public static string Fine(string text) =>
        $"""<p style="margin:16px 0 0; font-size:14px; line-height:1.6; color:{Muted};">{text}</p>""";

    private static string Site(string siteUrl) =>
        string.IsNullOrWhiteSpace(siteUrl) ? "" : siteUrl.TrimEnd('/');

    private static string LoginUrl(string siteUrl) =>
        WebUtility.HtmlEncode(Site(siteUrl) + "/meld-aan");

    /// <summary>
    /// Table-based and inline-styled throughout, in px rather than rem: Outlook renders
    /// through Word, which drops flex and grid outright and resolves rem unpredictably.
    /// </summary>
    private static string Shell(string heading, string firstName, string body)
    {
        var name = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(firstName) ? "Stadsbouer" : firstName);
        return $"""
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{BgWarm}; margin:0; padding:24px 12px;">
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:560px; max-width:560px; background:#FFFFFF; border:1px solid {BorderSoft}; border-radius:4px;">
                    <tr>
                      <td style="padding:36px 36px 0;">
                        <p style="margin:0 0 10px; font-family:{FontDisplay}; font-size:14px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:{Muted};">Orania Oewerpad</p>
                        <h1 style="margin:0; font-family:{FontDisplay}; font-size:34px; line-height:1.1; font-weight:700; color:{Tar};">{WebUtility.HtmlEncode(heading)}</h1>
                        {Rule()}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:26px 36px 30px; font-family:{FontBody}; font-size:16px; line-height:1.6; color:{Ink};">
                        <p style="margin:0 0 16px;">Beste {name}!</p>
                        {body}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:22px 36px 32px; border-top:1px solid {BorderSoft}; font-family:{FontBody}; font-size:16px; line-height:1.6; color:{Ink};">
                        <p style="margin:0;">Orania groete,<br>Die Orania Beweging-span</p>
                        <p style="margin:12px 0 0; font-size:14px; color:{Muted};">inligting&#64;orania.co.za &middot; 053 207 0062</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            """;
    }
}
