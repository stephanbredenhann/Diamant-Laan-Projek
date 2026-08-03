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
    /// True for placeholder accounts created by a checkout that was completed without signing up.
    /// A guest user has no password, no roles and usually no email; it exists so that
    /// <see cref="Square.OwnerId"/> and <see cref="Purchase.UserId"/> stay non-null for guest purchases.
    /// Cleared when the guest claims the purchase (see GuestPurchaseService).
    /// </summary>
    public bool IsGuest { get; set; }

    public bool IsAnonymized { get; set; }
    public DateTime? AnonymizedAt { get; set; }
    public string PhoneCountryCode { get; set; } = "+27";
    public ICollection<Square> Squares { get; set; } = new List<Square>();
    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}
