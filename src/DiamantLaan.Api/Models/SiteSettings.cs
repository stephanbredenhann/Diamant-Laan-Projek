namespace DiamantLaan.Api.Models;

public class SiteSettings
{
    public int Id { get; set; }
    public bool ShowStatsSection { get; set; } = true;
    public bool ShowTotalRaised { get; set; } = true;

    /// <summary>
    /// Lowest block number "Kies vir my" should hand out first. Inclusive: 2000 means
    /// block 2000 is eligible. 0 means off, i.e. the normal lowest-first assignment.
    /// Blocks below the offset are still used, but only once the range above runs dry.
    /// </summary>
    public int KiesVirMyOffset { get; set; }
}
