using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Api.Extensions;
using MyPlatform.Application.DTOs.RestaurantMenu;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Enums;

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

        var authCheck = await ValidateRestaurantClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        var details = await _menuService.GetBusinessDetailsAsync(targetClientId.Value);
        return Ok(details);
    }

    [HttpPut("business")]
    public async Task<IActionResult> SaveBusinessDetails([FromBody] SaveBusinessDetailsDto dto, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var authCheck = await ValidateRestaurantClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        var updated = await _menuService.SaveBusinessDetailsAsync(targetClientId.Value, dto);
        return Ok(updated);
    }

    [HttpPatch("theme")]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateThemeDto dto, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var authCheck = await ValidateRestaurantClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        await _menuService.UpdateThemeAsync(targetClientId.Value, dto.Theme);
        return Ok(new { success = true, theme = dto.Theme });
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var authCheck = await ValidateRestaurantClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        var isActive = await _clientService.GetClientStatusAsync(targetClientId.Value);
        return Ok(new { isActive });
    }

    [HttpPatch("status")]
    public async Task<IActionResult> ToggleStatus([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var authCheck = await ValidateRestaurantClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        var isActive = await _clientService.ToggleClientStatusAsync(targetClientId.Value, isClientSelfToggle: !User.IsAdmin());
        return Ok(new { isActive });
    }

    private async Task<IActionResult?> ValidateRestaurantClientAsync(Guid clientId)
    {
        try
        {
            var client = await _clientService.GetClientByIdAsync(clientId);
            if (!client.Services.Contains(ServiceType.RestaurantMenu))
            {
                return Unauthorized(new { message = "Your restaurant menu service has been removed. Please log in again." });
            }
            return null;
        }
        catch (KeyNotFoundException)
        {
            return Unauthorized(new { message = "Your client account has been deleted. Please log in again." });
        }
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
