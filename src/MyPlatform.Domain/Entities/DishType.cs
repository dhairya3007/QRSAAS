using MyPlatform.Domain.Common;

namespace MyPlatform.Domain.Entities;

public class DishType : BaseEntity
{
    public Guid ClientId { get; set; }
    public virtual Client Client { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
