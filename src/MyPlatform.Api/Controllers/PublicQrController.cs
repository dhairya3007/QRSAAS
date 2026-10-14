using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Application.DTOs.PersonalQr;
using MyPlatform.Application.Interfaces;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicQrController : ControllerBase
{
    private readonly IPublicQrService _publicQrService;

    public PublicQrController(IPublicQrService publicQrService)
    {
        _publicQrService = publicQrService;
    }

    /// <summary>
    /// Identifies whether the token is for restaurant_menu or personal_qr
    /// </summary>
    [HttpGet("qr/{token}/type")]
    public async Task<IActionResult> IdentifyToken(string token)
    {
        try
        {
            var result = await _publicQrService.IdentifyTokenAsync(token);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Invalid Token." });
        }
    }

    /// <summary>
    /// Fetches the public menu by QR token
    /// </summary>
    [HttpGet("menus/{token}")]
    public async Task<IActionResult> GetPublicMenu(string token)
    {
        try
        {
            var menu = await _publicQrService.GetPublicMenuByTokenAsync(token);
            return Ok(menu);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Fetches the public personal card by QR token
    /// </summary>
    [HttpGet("personal-qr/{token}")]
    public async Task<IActionResult> GetPublicPersonalCard(string token)
    {
        try
        {
            var card = await _publicQrService.GetPublicPersonalCardByTokenAsync(token);
            return Ok(card);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Increments scan counter when a user scans the QR code
    /// </summary>
    [HttpPost("qr/{token}/scans")]
    public async Task<IActionResult> IncrementScanCount(string token)
    {
        await _publicQrService.IncrementScanCountAsync(token);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Increments click count when a user clicks a CTA link
    /// </summary>
    [HttpPost("personal-qr/{token}/links/{linkId:guid}/click")]
    public async Task<IActionResult> IncrementLinkClick(string token, Guid linkId)
    {
        await _publicQrService.IncrementLinkClickAsync(token, linkId);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Submits a lead message inquiry from the public digital card
    /// </summary>
    [HttpPost("personal-qr/{token}/inquiries")]
    public async Task<IActionResult> SubmitInquiry(string token, [FromBody] CreateInquiryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        try
        {
            await _publicQrService.SubmitInquiryAsync(token, dto);
            return Ok(new { success = true });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
