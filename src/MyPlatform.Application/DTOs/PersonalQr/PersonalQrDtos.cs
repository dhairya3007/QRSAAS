namespace MyPlatform.Application.DTOs.PersonalQr;

public class CallToActionLinkDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Icon { get; set; } = "globe";
    public int Clicks { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool? IsEnabled { get; set; } // alias used in some frontend components
}

public class PersonalQrProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string QrToken { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string? ProfilePic { get; set; }
    public string Theme { get; set; } = "minimal";
    public string? Education10th { get; set; }
    public string? Education12th { get; set; }
    public string? EducationCollege { get; set; }
    public string? EducationMasters { get; set; }
    public string? EducationPhD { get; set; }
    public List<CallToActionLinkDto> Links { get; set; } = new();
}

public class UpdatePersonalQrProfileDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Designation { get; set; }
    public string? Bio { get; set; }
    public string? ProfilePic { get; set; }
    public string? Theme { get; set; }
    public string? Education10th { get; set; }
    public string? Education12th { get; set; }
    public string? EducationCollege { get; set; }
    public string? EducationMasters { get; set; }
    public string? EducationPhD { get; set; }
    public List<CallToActionLinkDto>? Links { get; set; }
}

public class InquiryDto
{
    public string Id { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateInquiryDto
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Message { get; set; }
}
