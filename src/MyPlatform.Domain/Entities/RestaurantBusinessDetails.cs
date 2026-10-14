using MyPlatform.Domain.Common;

namespace MyPlatform.Domain.Entities;

public class RestaurantBusinessDetails : BaseEntity
{
    public Guid ClientId { get; set; }
    public virtual Client Client { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string Theme { get; set; } = "modern";
    public bool ThemeUpdated { get; set; } = false;
}
