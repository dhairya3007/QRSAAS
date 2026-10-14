using MyPlatform.Application.DTOs.PersonalQr;

namespace MyPlatform.Application.Interfaces;

public interface IPersonalQrService
{
    Task<PersonalQrProfileDto?> GetPersonalQrProfileAsync(Guid clientId);
    Task<PersonalQrProfileDto> UpdatePersonalQrProfileAsync(Guid clientId, UpdatePersonalQrProfileDto dto);
    Task<bool> UpdatePersonalQrThemeAsync(Guid clientId, string themeId);
    Task<List<InquiryDto>> GetInquiriesAsync(Guid clientId);
    Task<bool> DeleteInquiryAsync(Guid clientId, Guid inquiryId);
}
