using MyPlatform.Domain.Common;

namespace MyPlatform.Domain.Entities;

public class Dish : BaseEntity
{
    public Guid ClientId { get; set; }
    public virtual Client Client { get; set; } = null!;

    public Guid CategoryId { get; set; }
    public virtual Category Category { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Quantity { get; set; } = string.Empty;
    public string Type { get; set; } = "Veg";
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
}
