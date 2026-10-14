using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Api.Extensions;
using MyPlatform.Application.Interfaces;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InquiriesController : ControllerBase
{
    private readonly IPersonalQrService _personalQrService;

    public InquiriesController(IPersonalQrService personalQrService)
    {
        _personalQrService = personalQrService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var inquiries = await _personalQrService.GetInquiriesAsync(targetClientId.Value);
        return Ok(inquiries);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid? clientId = null)
    {
        var targetClientId = GetEffectiveClientId(clientId);
        if (targetClientId == null) return Unauthorized(new { message = "Client identity required." });

        var deleted = await _personalQrService.DeleteInquiryAsync(targetClientId.Value, id);
        if (!deleted) return NotFound(new { message = "Inquiry not found." });
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
