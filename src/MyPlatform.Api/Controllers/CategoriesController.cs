using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Api.Extensions;
using MyPlatform.Application.DTOs.RestaurantMenu;
using MyPlatform.Application.Interfaces;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly IRestaurantMenuService _menuService;

    public CategoriesController(IRestaurantMenuService menuService)
    {
        _menuService = menuService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var categories = await _menuService.GetCategoriesAsync(targetClientId.Value);
        return Ok(categories);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] CreateCategoryDto dto)
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
            return BadRequest(new { message = "Category name is required." });
        }

        var created = await _menuService.AddCategoryAsync(targetClientId.Value, dto.Name);
        return Ok(created);
    }

    [HttpPatch("{id:guid}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        try
        {
            var result = await _menuService.ToggleCategoryStatusAsync(targetClientId.Value, id);
            return Ok(new { isActive = result.IsActive, affectedDishesCount = result.AffectedDishesCount });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Category not found." });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var deleted = await _menuService.DeleteCategoryAsync(targetClientId.Value, id);
        if (!deleted) return NotFound(new { message = "Category not found or unauthorized." });
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
