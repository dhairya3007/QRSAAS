using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Entities;

namespace MyPlatform.Infrastructure.Identity;

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(ApplicationUser user, string role, Client? client, IList<string> services)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "SuperSecretKeyForMyPlatformJwtAuthenticationMustBeLongerThan32Bytes!";
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "MyPlatformApi";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "MyPlatformReactClient";
        var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryInMinutes"], out var exp) ? exp : 1440;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Role, role),
            new(ClaimTypes.Name, user.FullName)
        };

        if (client != null)
        {
            claims.Add(new Claim("client_id", client.Id.ToString()));
            claims.Add(new Claim("qr_token", client.QrToken));
            if (!string.IsNullOrEmpty(client.PersonalQrToken))
            {
                claims.Add(new Claim("personal_qr_token", client.PersonalQrToken));
            }
        }

        if (services.Any())
        {
            claims.Add(new Claim("services", string.Join(",", services)));
        }

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateSetupToken(Guid clientId, string clientName)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "SuperSecretKeyForMyPlatformJwtAuthenticationMustBeLongerThan32Bytes!";
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "MyPlatformApi";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "MyPlatformReactClient";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("client_id", clientId.ToString()),
            new("purpose", "client_setup"),
            new(ClaimTypes.Name, clientName)
        };

        // Setup onboarding link valid for 7 days
        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public Guid? ValidateSetupToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        var jwtKey = _configuration["Jwt:Key"] ?? "SuperSecretKeyForMyPlatformJwtAuthenticationMustBeLongerThan32Bytes!";
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "MyPlatformApi";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "MyPlatformReactClient";

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(jwtKey);

        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,
                ValidateAudience = true,
                ValidAudience = jwtAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            }, out _);

            var purpose = principal.FindFirstValue("purpose");
            if (purpose != "client_setup") return null;

            var clientIdStr = principal.FindFirstValue("client_id");
            if (Guid.TryParse(clientIdStr, out var clientId))
            {
                return clientId;
            }

            return null;
        }
        catch
        {
            // Invalid signature, expired, or non-JWT token (fallback)
            return null;
        }
    }
}
