using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MyPlatform.Application.DTOs.Auth;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Entities;
using MyPlatform.Domain.Enums;
using MyPlatform.Infrastructure.Persistence;

namespace MyPlatform.Infrastructure.Identity;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext dbContext,
        IJwtTokenService jwtTokenService)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Your account has been deactivated. Please contact support.");
        }

        var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!isPasswordValid)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var primaryRole = roles.FirstOrDefault() ?? user.UserType;

        Client? client = null;
        var activeServices = new List<string>();
        var theme = "modern";

        if (user.ClientId.HasValue)
        {
            client = await _dbContext.Clients
                .Include(c => c.Subscriptions)
                .Include(c => c.BusinessDetails)
                .FirstOrDefaultAsync(c => c.Id == user.ClientId.Value);

            if (client != null)
            {
                activeServices = client.Subscriptions
                    .Where(s => !s.IsSuspended)
                    .Select(s => s.ServiceKey)
                    .ToList();

                theme = client.BusinessDetails?.Theme ?? "modern";
            }
        }

        var token = _jwtTokenService.GenerateToken(user, primaryRole, client, activeServices);

        return new AuthResponseDto
        {
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                Role = primaryRole,
                Name = user.FullName,
                QrToken = client?.QrToken,
                PersonalQrToken = client?.PersonalQrToken,
                Theme = theme,
                Services = activeServices
            }
        };
    }

    public async Task<SetupInfoDto> GetSetupInfoAsync(string token)
    {
        Client? client = null;

        // 1. Validate as signed setup token to pinpoint the exact client
        var clientId = _jwtTokenService.ValidateSetupToken(token);
        if (clientId.HasValue)
        {
            client = await _dbContext.Clients
                .Include(c => c.Subscriptions)
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == clientId.Value);
        }

        // 2. Backwards-compatible fallback (QR token)
        if (client == null)
        {
            client = await _dbContext.Clients
                .Include(c => c.Subscriptions)
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.QrToken == token || c.PersonalQrToken == token);
        }

        if (client == null)
        {
            throw new KeyNotFoundException("Invalid or expired setup link. Please contact your administrator.");
        }

        var alreadySetup = client.User != null && !string.IsNullOrEmpty(client.User.PasswordHash);

        return new SetupInfoDto
        {
            ClientId = client.Id,
            Name = client.Name,
            Email = client.Email,
            AlreadySetup = alreadySetup,
            Services = client.Subscriptions.Select(s => s.ServiceKey).ToList()
        };
    }

    public async Task<AuthResponseDto> CompleteSetupAsync(CompleteSetupRequestDto request)
    {
        Client? client = null;

        // 1. Validate signed setup token to pinpoint the exact client
        var clientId = _jwtTokenService.ValidateSetupToken(request.Token);
        if (clientId.HasValue)
        {
            client = await _dbContext.Clients
                .Include(c => c.Subscriptions)
                .Include(c => c.User)
                .Include(c => c.BusinessDetails)
                .FirstOrDefaultAsync(c => c.Id == clientId.Value);
        }

        // 2. Backwards-compatible fallback
        if (client == null)
        {
            client = await _dbContext.Clients
                .Include(c => c.Subscriptions)
                .Include(c => c.User)
                .Include(c => c.BusinessDetails)
                .FirstOrDefaultAsync(c => c.QrToken == request.Token || c.PersonalQrToken == request.Token);
        }

        if (client == null)
        {
            throw new KeyNotFoundException("Invalid or expired setup link.");
        }

        // Validate email uniqueness across other client accounts
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null && existingUser.ClientId != client.Id)
        {
            throw new InvalidOperationException("This email address is already in use by another account. Please use a different email address.");
        }

        // Update Client's email
        client.Email = request.Email;

        ApplicationUser? user = client.User ?? existingUser;

        if (user == null)
        {
            user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FullName = client.Name,
                UserType = UserRole.Client,
                ClientId = client.Id,
                IsActive = true
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Failed to setup password: {errors}");
            }

            await _userManager.AddToRoleAsync(user, UserRole.Client);
        }
        else
        {
            user.UserName = request.Email;
            user.Email = request.Email;
            user.FullName = client.Name;

            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                var addPasswordResult = await _userManager.AddPasswordAsync(user, request.Password);
                if (!addPasswordResult.Succeeded)
                {
                    var errors = string.Join(", ", addPasswordResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to set password: {errors}");
                }
            }
            else
            {
                // Account already has a password
                throw new InvalidOperationException("This account has already completed setup. Please log in directly.");
            }

            await _userManager.UpdateAsync(user);
        }

        // Automatically mark all client subscriptions as setup completed
        foreach (var sub in client.Subscriptions)
        {
            sub.IsSetupCompleted = true;
        }

        await _dbContext.SaveChangesAsync();

        var activeServices = client.Subscriptions
            .Where(s => !s.IsSuspended)
            .Select(s => s.ServiceKey)
            .ToList();

        var token = _jwtTokenService.GenerateToken(user, UserRole.Client, client, activeServices);

        return new AuthResponseDto
        {
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                Role = UserRole.Client,
                Name = user.FullName,
                QrToken = client.QrToken,
                PersonalQrToken = client.PersonalQrToken,
                Theme = client.BusinessDetails?.Theme ?? "modern",
                Services = activeServices
            }
        };
    }

    public async Task<UserDto> GetCurrentUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var primaryRole = roles.FirstOrDefault() ?? user.UserType;

        Client? client = null;
        var activeServices = new List<string>();
        var theme = "modern";

        if (user.ClientId.HasValue)
        {
            client = await _dbContext.Clients
                .Include(c => c.Subscriptions)
                .Include(c => c.BusinessDetails)
                .FirstOrDefaultAsync(c => c.Id == user.ClientId.Value);

            if (client != null)
            {
                activeServices = client.Subscriptions
                    .Where(s => !s.IsSuspended)
                    .Select(s => s.ServiceKey)
                    .ToList();

                theme = client.BusinessDetails?.Theme ?? "modern";
            }
        }

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            Role = primaryRole,
            Name = user.FullName,
            QrToken = client?.QrToken,
            PersonalQrToken = client?.PersonalQrToken,
            Theme = theme,
            Services = activeServices
        };
    }

    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequestDto request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Password change failed: {errors}");
        }

        return true;
    }
}
