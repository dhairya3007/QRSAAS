using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyPlatform.Api.Extensions;
using MyPlatform.Application.DTOs.Clients;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Enums;

namespace MyPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly IClientService _clientService;

    public ClientsController(IClientService clientService)
    {
        _clientService = clientService;
    }

    [HttpGet]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> GetAll()
    {
        var clients = await _clientService.GetAllClientsAsync();
        return Ok(clients);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!User.IsAdmin() && User.GetClientId() != id)
        {
            return Forbid();
        }

        try
        {
            var client = await _clientService.GetClientByIdAsync(id);
            return Ok(client);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Create([FromBody] CreateClientRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Client name is required." });
        }

        try
        {
            var client = await _clientService.CreateClientAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = client.Id }, client);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateClientRequestDto request)
    {
        try
        {
            var updated = await _clientService.UpdateClientAsync(id, request);
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
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _clientService.DeleteClientAsync(id);
        if (!deleted) return NotFound(new { message = "Client not found." });
        return Ok(new { success = true });
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        if (!User.IsAdmin() && User.GetClientId() != id)
        {
            return Forbid();
        }

        var isClientSelf = !User.IsAdmin();
        var result = await _clientService.ToggleClientStatusAsync(id, isClientSelfToggle: isClientSelf);
        return Ok(new { isActive = result });
    }

    [HttpPatch("{id:guid}/services/{serviceName}/suspend")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> ToggleServiceSuspension(Guid id, string serviceName)
    {
        var result = await _clientService.ToggleServiceSuspensionAsync(id, serviceName);
        if (!result) return NotFound(new { message = "Client or service subscription not found." });
        return Ok(new { success = true });
    }

    [HttpDelete("{id:guid}/services/{serviceName}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> RemoveService(Guid id, string serviceName)
    {
        var result = await _clientService.RemoveServiceFromClientAsync(id, serviceName);
        if (!result) return NotFound(new { message = "Client or service not found." });
        return Ok(new { success = true });
    }

    [Authorize(Roles = UserRole.Admin)]
    [HttpPatch("{id:guid}/setup-complete")]
    public async Task<IActionResult> MarkSetupComplete(Guid id, [FromQuery] string? service = null)
    {
        await _clientService.MarkSetupCompleteAsync(id, service);
        return Ok(new { success = true });
    }
}
