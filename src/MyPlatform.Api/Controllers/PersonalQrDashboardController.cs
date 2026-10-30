using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Api.Extensions;
using MyPlatform.Application.DTOs.PersonalQr;
using MyPlatform.Application.DTOs.RestaurantMenu;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Enums;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/personal-qr-dashboard")]
[Authorize]
public class PersonalQrDashboardController : ControllerBase
{
    private readonly IPersonalQrService _personalQrService;
    private readonly IClientService _clientService;

    public PersonalQrDashboardController(IPersonalQrService personalQrService, IClientService clientService)
    {
        _personalQrService = personalQrService;
        _clientService = clientService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var authCheck = await ValidatePersonalQrClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        var profile = await _personalQrService.GetPersonalQrProfileAsync(targetClientId.Value);
        return Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdatePersonalQrProfileDto dto, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var authCheck = await ValidatePersonalQrClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        try
        {
            var updated = await _personalQrService.UpdatePersonalQrProfileAsync(targetClientId.Value, dto);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("theme")]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateThemeDto dto, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var authCheck = await ValidatePersonalQrClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        var success = await _personalQrService.UpdatePersonalQrThemeAsync(targetClientId.Value, dto.Theme);
        if (!success) return NotFound(new { message = "Profile not found." });
        return Ok(new { success = true, theme = dto.Theme });
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var authCheck = await ValidatePersonalQrClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        var isActive = await _clientService.GetClientStatusAsync(targetClientId.Value);
        return Ok(new { isActive });
    }

    [HttpPatch("status")]
    public async Task<IActionResult> ToggleStatus([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var authCheck = await ValidatePersonalQrClientAsync(targetClientId.Value);
        if (authCheck != null) return authCheck;

        var isActive = await _clientService.ToggleClientStatusAsync(targetClientId.Value, isClientSelfToggle: !User.IsAdmin());
        return Ok(new { isActive });
    }

    private async Task<IActionResult?> ValidatePersonalQrClientAsync(Guid clientId)
    {
        try
        {
            var client = await _clientService.GetClientByIdAsync(clientId);
            if (!client.Services.Contains(ServiceType.PersonalQr))
            {
                return Unauthorized(new { message = "Your personal QR service has been removed. Please log in again." });
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
