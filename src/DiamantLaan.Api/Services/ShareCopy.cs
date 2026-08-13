namespace DiamantLaan.Api.Services;

public static class ShareCopy
{
    public const string Description =
        "Finansier 1 m² teerpad vir R500 en word erken as ’n Stadsbouer op die Oewerpad-teerprojek.";

    public static string DisplayName(string? firstName)
    {
        var name = firstName?.Trim();
        return string.IsNullOrEmpty(name) ? "Iemand" : name;
    }

    /// <summary>Used for the OG image, the page title and the page heading.</summary>
    public static string Sentence(string? firstName, int count) =>
        $"{DisplayName(firstName)} het {count} m² geborg vir die Oewerpad in Orania!";
}
