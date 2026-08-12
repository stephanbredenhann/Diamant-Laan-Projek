namespace DiamantLaan.Api.Services;

public static class ShareCopy
{
    public const string Description =
        "Finansier 1 m² teerpad vir R500 en word erken as ’n Stadsbouer op die Oewerpad-teerprojek.";

    public static string MeterFrase(int count) => $"{count} vierkante meter";

    public static string DisplayName(string? firstName)
    {
        var name = firstName?.Trim();
        return string.IsNullOrEmpty(name) ? "Iemand" : name;
    }

    public static string ImageSentence(string? firstName, int count) =>
        $"{DisplayName(firstName)} het {MeterFrase(count)} geborg";

    public static string PageTitle(string? firstName, int count) =>
        $"{ImageSentence(firstName, count)} op Diamant Laan";
}
