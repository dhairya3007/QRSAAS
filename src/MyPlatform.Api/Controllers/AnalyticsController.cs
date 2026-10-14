using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Api.Extensions;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Enums;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IPublicQrService _publicQrService;
    private readonly IClientService _clientService;

    public AnalyticsController(IPublicQrService publicQrService, IClientService clientService)
    {
        _publicQrService = publicQrService;
        _clientService = clientService;
    }

    /// <summary>
    /// Gets scan count for client
    /// </summary>
    [HttpGet("scans")]
    public async Task<IActionResult> GetScanCount([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var count = await _publicQrService.GetScanCountByClientIdAsync(targetClientId.Value);
        return Ok(new { scanCount = count });
    }

    /// <summary>
    /// Super Admin dashboard metrics (Total clients, active clients, revenue)
    /// </summary>
    [HttpGet("admin/stats")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> GetAdminStats()
    {
        var stats = await _clientService.GetAdminStatsAsync();
        return Ok(stats);
    }

    private Guid? GetEffectiveClientId(Guid? requestedClientId)
    {
        if (User.IsAdmin() && requestedClientId.HasValue)
        {
            return requestedClientId.Value;
        }
        return User.GetClientId();
    }
}
