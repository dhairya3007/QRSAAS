using System.Security.Claims;
using MyPlatform.Domain.Enums;

namespace MyPlatform.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static string? GetUserId(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    public static Guid? GetClientId(this ClaimsPrincipal user)
    {
        var clientIdStr = user.FindFirstValue("client_id");
        if (Guid.TryParse(clientIdStr, out var clientId))
        {
            return clientId;
        }
        return null;
    }

    public static bool IsAdmin(this ClaimsPrincipal user)
    {
        return user.IsInRole(UserRole.Admin);
    }

    public static List<string> GetServices(this ClaimsPrincipal user)
    {
        var servicesStr = user.FindFirstValue("services");
        if (string.IsNullOrEmpty(servicesStr))
        {
            return new List<string>();
        }
        return servicesStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    }
}
