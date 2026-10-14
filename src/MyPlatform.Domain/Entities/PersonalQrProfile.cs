using MyPlatform.Domain.Common;

namespace MyPlatform.Domain.Entities;

public class PersonalQrProfile : BaseEntity
{
    public Guid ClientId { get; set; }
    public virtual Client Client { get; set; } = null!;

    public string QrToken { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string? ProfilePicUrl { get; set; }
    public string Theme { get; set; } = "minimal";

    public string? Education10th { get; set; }
    public string? Education12th { get; set; }
    public string? EducationCollege { get; set; }
    public string? EducationMasters { get; set; }
    public string? EducationPhD { get; set; }

    public virtual ICollection<CallToActionLink> Links { get; set; } = new List<CallToActionLink>();
}
