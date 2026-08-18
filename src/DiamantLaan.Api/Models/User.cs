using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace DiamantLaan.Api.Models;

public class User : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsOraniaResident { get; set; }
    public bool IsOraniaBewegingMember { get; set; }
    public bool ReceiveBlockProgressEmails { get; set; } = true;
    public bool MustChangePassword { get; set; }

    /// <summary>
    /// "af" or "en". Drives the language every email to this account is written in, and the
    /// language the site opens in once they sign in. Afrikaans is the default and the source
    /// language; the navbar toggle stays a local, session-only override that is not stored here.
    /// </summary>
    [MaxLength(2)]
    public string Language { get; set; } = "af";

    /// <summary>
    /// True for placeholder accounts created by a checkout that was completed without signing up.
    /// A guest user has no password, no roles and usually no email; it exists so that
    /// <see cref="Square.OwnerId"/> and <see cref="Purchase.UserId"/> stay non-null for guest purchases.
    /// Cleared when the guest claims the purchase (see GuestPurchaseService).
    /// </summary>
    public bool IsGuest { get; set; }

    public bool IsAnonymized { get; set; }
    public DateTime? AnonymizedAt { get; set; }

    /// <summary>
    /// Opaque token for the public /deel/{token} page. Null until the donor opts in.
    /// </summary>
    public string? ShareToken { get; set; }
    /// <summary>
    /// Name printed on the summary certificate, and on every block certificate that has not been
    /// given one of its own. Null means fall back to the account's first and last name.
    /// </summary>
    [MaxLength(100)]
    public string? CertificateName { get; set; }

    /// <summary>
    /// True when this account wants one certificate per block, each in its own name, rather than a
    /// single summary sheet covering everything. Chosen after a purchase and locked with the names,
    /// so it is stored rather than derived from whether any block carries its own name: a locked
    /// block keeps its name even after the account switches back to the summary sheet.
    /// </summary>
    public bool CertificateIndividual { get; set; }

    public string PhoneCountryCode { get; set; } = "+27";
    public ICollection<Square> Squares { get; set; } = new List<Square>();
    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}
