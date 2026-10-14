using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Domain.Common;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/themes")]
[AllowAnonymous]
public class ThemesController : ControllerBase
{
    /// <summary>
    /// Gets all themes, optionally filtered by service type (restaurant_menu or personal_qr).
    /// </summary>
    [HttpGet]
    public IActionResult GetThemes([FromQuery] string? service = null)
    {
        if (string.IsNullOrWhiteSpace(service))
        {
            return Ok(ThemeCatalog.AllThemes);
        }

        var filtered = ThemeCatalog.GetByService(service);
        return Ok(filtered);
    }

    /// <summary>
    /// Gets themes specific to Restaurant Menu service.
    /// </summary>
    [HttpGet("restaurant-menu")]
    public IActionResult GetRestaurantMenuThemes()
    {
        return Ok(ThemeCatalog.GetByService("restaurant_menu"));
    }

    /// <summary>
    /// Gets themes specific to Personal QR service.
    /// </summary>
    [HttpGet("personal-qr")]
    public IActionResult GetPersonalQrThemes()
    {
        return Ok(ThemeCatalog.GetByService("personal_qr"));
    }

    /// <summary>
    /// Gets a single theme by ID.
    /// </summary>
    [HttpGet("{id}")]
    public IActionResult GetThemeById(string id)
    {
        var theme = ThemeCatalog.GetById(id);
        if (theme == null)
        {
            return NotFound(new { message = $"Theme with ID '{id}' was not found." });
        }

        return Ok(theme);
    }
}
