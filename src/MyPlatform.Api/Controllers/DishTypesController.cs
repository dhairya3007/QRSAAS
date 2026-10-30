using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Api.Extensions;
using MyPlatform.Application.DTOs.RestaurantMenu;
using MyPlatform.Application.Interfaces;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/dish-types")]
[Authorize]
public class DishTypesController : ControllerBase
{
    private readonly IRestaurantMenuService _menuService;

    public DishTypesController(IRestaurantMenuService menuService)
    {
        _menuService = menuService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var types = await _menuService.GetDishTypesAsync(targetClientId.Value);
        return Ok(types);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] CreateDishTypeDto dto)
    {
        Guid? parsedClientId = null;
        if (!string.IsNullOrEmpty(dto.ClientId) && Guid.TryParse(dto.ClientId, out var cid))
        {
            parsedClientId = cid;
        }

        var targetClientId = GetEffectiveClientId(parsedClientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Dish type name is required." });
        }

        var created = await _menuService.AddDishTypeAsync(targetClientId.Value, dto.Name);
        return Ok(created);
    }

    [HttpPatch("{id:guid}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        try
        {
            var result = await _menuService.ToggleDishTypeStatusAsync(targetClientId.Value, id);
            return Ok(new { isActive = result.IsActive, affectedDishesCount = result.AffectedDishesCount });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Dish type not found." });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var deleted = await _menuService.DeleteDishTypeAsync(targetClientId.Value, id);
        if (!deleted) return NotFound(new { message = "Dish type not found or unauthorized." });
        return Ok(new { success = true });
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
