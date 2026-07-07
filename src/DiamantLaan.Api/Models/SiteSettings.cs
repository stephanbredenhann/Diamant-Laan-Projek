namespace DiamantLaan.Api.Models;

public class SiteSettings
{
    public int Id { get; set; }
    public bool ShowStatsSection { get; set; } = true;
    public bool ShowTotalRaised { get; set; } = true;
}
