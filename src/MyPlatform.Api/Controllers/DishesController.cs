using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Api.Extensions;
using MyPlatform.Application.DTOs.RestaurantMenu;
using MyPlatform.Application.Interfaces;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DishesController : ControllerBase
{
    private readonly IRestaurantMenuService _menuService;

    public DishesController(IRestaurantMenuService menuService)
    {
        _menuService = menuService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var dishes = await _menuService.GetDishesAsync(targetClientId.Value);
        return Ok(dishes);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] CreateDishDto dto)
    {
        Guid? parsedClientId = null;
        if (!string.IsNullOrEmpty(dto.ClientId) && Guid.TryParse(dto.ClientId, out var cid))
        {
            parsedClientId = cid;
        }

        var targetClientId = GetEffectiveClientId(parsedClientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.CategoryId))
        {
            return BadRequest(new { message = "Dish name and category are required." });
        }

        try
        {
            var created = await _menuService.AddDishAsync(targetClientId.Value, dto);
            return Ok(created);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDishDto dto, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        try
        {
            var updated = await _menuService.UpdateDishAsync(targetClientId.Value, id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var deleted = await _menuService.DeleteDishAsync(targetClientId.Value, id);
        if (!deleted) return NotFound(new { message = "Dish not found or unauthorized." });
        return Ok(new { success = true });
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var newStatus = await _menuService.ToggleDishStatusAsync(targetClientId.Value, id);
        return Ok(new { isActive = newStatus });
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
