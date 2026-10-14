using Microsoft.AspNetCore.Identity;

namespace MyPlatform.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string UserType { get; set; } = "client"; // "admin" or "client"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }

    // Multi-tenant link to Client record (null for Super Admin)
    public Guid? ClientId { get; set; }
    public virtual Client? Client { get; set; }
}
