using MyPlatform.Application.DTOs.PersonalQr;
using MyPlatform.Application.DTOs.Public;

namespace MyPlatform.Application.Interfaces;

public interface IPublicQrService
{
    Task<TokenIdentifyResponseDto> IdentifyTokenAsync(string token);
    Task<PublicMenuResponseDto> GetPublicMenuByTokenAsync(string token);
    Task<PublicPersonalCardResponseDto> GetPublicPersonalCardByTokenAsync(string token);
    Task<bool> IncrementScanCountAsync(string token);
    Task<bool> IncrementLinkClickAsync(string token, Guid linkId);
    Task<bool> SubmitInquiryAsync(string token, CreateInquiryDto dto);
    Task<int> GetScanCountByClientIdAsync(Guid clientId, string? serviceKey = null);
}
