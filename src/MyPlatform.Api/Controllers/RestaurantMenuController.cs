using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Api.Extensions;
using MyPlatform.Application.DTOs.RestaurantMenu;
using MyPlatform.Application.Interfaces;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/restaurant-menu")]
[Authorize]
public class RestaurantMenuController : ControllerBase
{
    private readonly IRestaurantMenuService _menuService;
    private readonly IClientService _clientService;

    public RestaurantMenuController(IRestaurantMenuService menuService, IClientService clientService)
    {
        _menuService = menuService;
        _clientService = clientService;
    }

    [HttpGet("business")]
    public async Task<IActionResult> GetBusinessDetails([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var details = await _menuService.GetBusinessDetailsAsync(targetClientId.Value);
        return Ok(details);
    }

    [HttpPut("business")]
    public async Task<IActionResult> SaveBusinessDetails([FromBody] SaveBusinessDetailsDto dto, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var updated = await _menuService.SaveBusinessDetailsAsync(targetClientId.Value, dto);
        return Ok(updated);
    }

    [HttpPatch("theme")]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateThemeDto dto, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        await _menuService.UpdateThemeAsync(targetClientId.Value, dto.Theme);
        return Ok(new { success = true, theme = dto.Theme });
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var isActive = await _clientService.GetClientStatusAsync(targetClientId.Value);
        return Ok(new { isActive });
    }

    [HttpPatch("status")]
    public async Task<IActionResult> ToggleStatus([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var isActive = await _clientService.ToggleClientStatusAsync(targetClientId.Value, isClientSelfToggle: !User.IsAdmin());
        return Ok(new { isActive });
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
