namespace DiamantLaan.Api.Models.Dtos;

public class KiesVirMyOffsetDto
{
    public int Offset { get; set; }

    /// <summary>
    /// How many saleable blocks are still free at or above the offset. Read-only on the
    /// way in: the admin tab shows it so it is visible when the range is about to run dry.
    /// </summary>
    public int AvailableAtOrAboveOffset { get; set; }
}
