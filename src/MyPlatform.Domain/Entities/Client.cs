using MyPlatform.Domain.Common;

namespace MyPlatform.Domain.Entities;

public class Client : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string QrToken { get; set; } = string.Empty;
    public string? PersonalQrToken { get; set; }
    public bool IsActive { get; set; } = true;
    public int ScanCount { get; set; } = 0;

    // Subscribed modular services (e.g. restaurant_menu, personal_qr)
    public virtual ICollection<ClientServiceSubscription> Subscriptions { get; set; } = new List<ClientServiceSubscription>();

    // Restaurant Menu module relations
    public virtual RestaurantBusinessDetails? BusinessDetails { get; set; }
    public virtual ICollection<Category> Categories { get; set; } = new List<Category>();
    public virtual ICollection<DishType> DishTypes { get; set; } = new List<DishType>();
    public virtual ICollection<Dish> Dishes { get; set; } = new List<Dish>();

    // Personal QR module relations
    public virtual PersonalQrProfile? PersonalProfile { get; set; }
    public virtual ICollection<Inquiry> Inquiries { get; set; } = new List<Inquiry>();

    // Associated Identity user account
    public virtual ApplicationUser? User { get; set; }
}
