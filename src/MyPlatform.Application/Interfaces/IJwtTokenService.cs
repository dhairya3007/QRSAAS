using MyPlatform.Domain.Entities;

namespace MyPlatform.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(ApplicationUser user, string role, Client? client, IList<string> services);
    string GenerateSetupToken(Guid clientId, string clientName);
    Guid? ValidateSetupToken(string token);
}
