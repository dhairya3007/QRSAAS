using MyPlatform.Domain.Common;

namespace MyPlatform.Domain.Entities;

public class Category : BaseEntity
{
    public Guid ClientId { get; set; }
    public virtual Client Client { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public virtual ICollection<Dish> Dishes { get; set; } = new List<Dish>();
}
