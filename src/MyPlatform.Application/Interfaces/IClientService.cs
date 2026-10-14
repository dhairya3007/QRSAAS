using MyPlatform.Application.DTOs.Analytics;
using MyPlatform.Application.DTOs.Clients;

namespace MyPlatform.Application.Interfaces;

public interface IClientService
{
    Task<List<ClientDto>> GetAllClientsAsync();
    Task<ClientDto> GetClientByIdAsync(Guid id);
    Task<ClientDto> CreateClientAsync(CreateClientRequestDto request);
    Task<ClientDto> UpdateClientAsync(Guid id, UpdateClientRequestDto request);
    Task<bool> DeleteClientAsync(Guid id);
    Task<bool> GetClientStatusAsync(Guid id);
    Task<bool> ToggleClientStatusAsync(Guid id, bool isClientSelfToggle = false);
    Task<bool> ToggleServiceSuspensionAsync(Guid id, string serviceName);
    Task<bool> RemoveServiceFromClientAsync(Guid id, string serviceName);
    Task<bool> MarkSetupCompleteAsync(Guid id, string? serviceName = null);
    Task<AdminStatsDto> GetAdminStatsAsync();
}
