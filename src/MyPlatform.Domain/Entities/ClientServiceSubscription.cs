using MyPlatform.Domain.Common;

namespace MyPlatform.Domain.Entities;

public class ClientServiceSubscription : BaseEntity
{
    public Guid ClientId { get; set; }
    public virtual Client Client { get; set; } = null!;

    public string ServiceKey { get; set; } = string.Empty; // "restaurant_menu", "personal_qr"
    public int DurationMonths { get; set; } = 1;
    public DateTime ExpireAtUtc { get; set; }
    public bool IsSuspended { get; set; } = false;
    public bool IsSetupCompleted { get; set; } = false;
    public int ScanCount { get; set; } = 0;
}
