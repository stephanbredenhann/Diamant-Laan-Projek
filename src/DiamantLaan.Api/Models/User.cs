using Microsoft.AspNetCore.Identity;

namespace DiamantLaan.Api.Models;

public class User : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsOraniaResident { get; set; }
    public bool ReceiveBlockProgressEmails { get; set; } = true;
    public string PhoneCountryCode { get; set; } = "+27";
    public ICollection<Square> Squares { get; set; } = new List<Square>();
    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}
