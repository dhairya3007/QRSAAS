namespace MyPlatform.Application.DTOs.PersonalQr;

public class CtaMediaItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Src { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Type { get; set; } = "image"; // "image" or "video"
}

public class CtaFileDto
{
    public string Name { get; set; } = string.Empty;
    public string Src { get; set; } = string.Empty;
    public long? Size { get; set; }
}

public class CtaDynamicConfig
{
    public string? CountryCode { get; set; }
    public string? RichText { get; set; }
    public CtaFileDto? File { get; set; }
    public List<CtaMediaItemDto>? MediaItems { get; set; }
}

public class CallToActionLinkDto
{
    public string Id { get; set; } = string.Empty;
    public string Category { get; set; } = "Social Media";
    public string Type { get; set; } = "Website";
    public string Title { get; set; } = string.Empty;
    public string? CustomLabel { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Value { get; set; }
    public string Icon { get; set; } = "globe";
    public int Clicks { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool? IsEnabled { get; set; } // alias used in some frontend components

    // Dynamic fields
    public string? CountryCode { get; set; }
    public string? RichText { get; set; }
    public CtaFileDto? File { get; set; }
    public List<CtaMediaItemDto>? MediaItems { get; set; }
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
