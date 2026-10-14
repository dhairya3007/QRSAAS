namespace MyPlatform.Application.DTOs.Analytics;

public class ScanCountDto
{
    public int ScanCount { get; set; }
}

public class AdminStatsDto
{
    public int Total { get; set; }
    public int Active { get; set; }
    public decimal Revenue { get; set; }
}
