using MyPlatform.Application.DTOs.Auth;

namespace MyPlatform.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
    Task<SetupInfoDto> GetSetupInfoAsync(string token);
    Task<AuthResponseDto> CompleteSetupAsync(CompleteSetupRequestDto request);
    Task<UserDto> GetCurrentUserAsync(string userId);
    Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequestDto request);
}
