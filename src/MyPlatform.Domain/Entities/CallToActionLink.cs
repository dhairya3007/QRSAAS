using MyPlatform.Domain.Common;

namespace MyPlatform.Domain.Entities;

public class CallToActionLink : BaseEntity
{
    public Guid ProfileId { get; set; }
    public virtual PersonalQrProfile Profile { get; set; } = null!;

    public string Category { get; set; } = "Social Media";
    public string Type { get; set; } = "Website";
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Icon { get; set; } = "globe";
    public int Clicks { get; set; } = 0;
    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public string? ConfigJson { get; set; }
}
