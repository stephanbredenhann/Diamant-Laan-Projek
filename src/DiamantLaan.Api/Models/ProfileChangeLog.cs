namespace DiamantLaan.Api.Models;

public class ProfileChangeLog
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public string ChangeType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class ProfileChangeTypes
{
    public const string Profile = "Profile";
    public const string Email = "Email";
    public const string Password = "Password";
    public const string Preferences = "Preferences";
}
