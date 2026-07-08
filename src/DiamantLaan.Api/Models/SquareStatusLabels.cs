using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

public static class SquareStatusLabels
{
    public static string Get(SquareStatus status) => status switch
    {
        SquareStatus.NogNieBeginNie => "Nog nie begin nie",
        SquareStatus.Voorberei => "Voorberei",
        SquareStatus.BesigOmTeTeer => "Besig om te teer",
        SquareStatus.KlaarGeteer => "Klaar geteer",
        _ => status.ToString()
    };
}
