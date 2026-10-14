using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MyPlatform.Application.DTOs.Analytics;
using MyPlatform.Application.DTOs.Clients;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Entities;
using MyPlatform.Domain.Enums;
using MyPlatform.Infrastructure.Persistence;

namespace MyPlatform.Infrastructure.Services;

public class ClientService : IClientService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public ClientService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<List<ClientDto>> GetAllClientsAsync()
    {
        var clients = await _context.Clients
            .Include(c => c.Subscriptions)
            .Include(c => c.BusinessDetails)
            .Include(c => c.Categories)
            .Include(c => c.Dishes)
            .Include(c => c.PersonalProfile)
                .ThenInclude(p => p!.Links)
            .OrderByDescending(c => c.CreatedAtUtc)
            .ToListAsync();

        return clients.Select(MapToClientDto).ToList();
    }

    public async Task<ClientDto> GetClientByIdAsync(Guid id)
    {
        var client = await _context.Clients
            .Include(c => c.Subscriptions)
            .Include(c => c.BusinessDetails)
            .Include(c => c.Categories)
            .Include(c => c.Dishes)
            .Include(c => c.PersonalProfile)
                .ThenInclude(p => p!.Links)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null)
        {
            throw new KeyNotFoundException("Client not found.");
        }

        return MapToClientDto(client);
    }

    public async Task<ClientDto> CreateClientAsync(CreateClientRequestDto request)
    {
        var qrToken = "qr-" + Guid.NewGuid().ToString("N")[..10];
        string? personalQrToken = null;

        if (request.Services.Contains(ServiceType.PersonalQr))
        {
            personalQrToken = "card-" + Guid.NewGuid().ToString("N")[..8];
        }

        var client = new Client
        {
            Name = request.Name,
            Email = request.Email ?? string.Empty,
            QrToken = qrToken,
            PersonalQrToken = personalQrToken,
            IsActive = true,
            ScanCount = 0
        };

        // Subscriptions & Expiries
        var durations = request.ServiceDurations ?? new Dictionary<string, int>();
        foreach (var serviceKey in request.Services)
        {
            var months = durations.TryGetValue(serviceKey, out var m) ? m : 1;
            client.Subscriptions.Add(new ClientServiceSubscription
            {
                ServiceKey = serviceKey,
                DurationMonths = months,
                ExpireAtUtc = DateTime.UtcNow.AddMonths(months),
                IsSuspended = false,
                IsSetupCompleted = false
            });
        }

        // Restaurant Menu profile initialization
        if (request.Services.Contains(ServiceType.RestaurantMenu))
        {
            client.BusinessDetails = new RestaurantBusinessDetails
            {
                Name = request.Name,
                Theme = "modern",
                ThemeUpdated = false
            };
        }

        // Personal QR profile initialization
        if (request.Services.Contains(ServiceType.PersonalQr))
        {
            client.PersonalProfile = new PersonalQrProfile
            {
                QrToken = personalQrToken!,
                FirstName = request.Name,
                Theme = "minimal"
            };
        }

        _context.Clients.Add(client);
        await _context.SaveChangesAsync();

        // If email and password provided, create ApplicationUser account
        if (!string.IsNullOrWhiteSpace(request.Email) && !string.IsNullOrWhiteSpace(request.Password))
        {
            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FullName = request.Name,
                UserType = UserRole.Client,
                ClientId = client.Id,
                IsActive = true,
                EmailConfirmed = true
            };

            var userResult = await _userManager.CreateAsync(user, request.Password);
            if (userResult.Succeeded)
            {
                await _userManager.AddToRoleAsync(user, UserRole.Client);
            }
        }

        return await GetClientByIdAsync(client.Id);
    }

    public async Task<ClientDto> UpdateClientAsync(Guid id, UpdateClientRequestDto request)
    {
        var client = await _context.Clients
            .Include(c => c.Subscriptions)
            .Include(c => c.BusinessDetails)
            .Include(c => c.PersonalProfile)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null)
        {
            throw new KeyNotFoundException("Client not found.");
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            client.Name = request.Name;
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            client.Email = request.Email;
        }

        // Update services if passed
        if (request.Services != null)
        {
            var currentServices = client.Subscriptions.Select(s => s.ServiceKey).ToList();
            var newServices = request.Services;

            // Add new services
            var durations = request.ServiceDurations ?? new Dictionary<string, int>();
            foreach (var sKey in newServices.Except(currentServices))
            {
                var months = durations.TryGetValue(sKey, out var m) ? m : 1;
                client.Subscriptions.Add(new ClientServiceSubscription
                {
                    ServiceKey = sKey,
                    DurationMonths = months,
                    ExpireAtUtc = client.CreatedAtUtc.AddMonths(months),
                    IsSuspended = false,
                    IsSetupCompleted = false
                });

                if (sKey == ServiceType.PersonalQr && client.PersonalProfile == null)
                {
                    var pToken = "card-" + Guid.NewGuid().ToString("N")[..8];
                    client.PersonalQrToken = pToken;
                    client.PersonalProfile = new PersonalQrProfile
                    {
                        QrToken = pToken,
                        FirstName = client.Name,
                        Theme = "minimal"
                    };
                }

                if (sKey == ServiceType.RestaurantMenu && client.BusinessDetails == null)
                {
                    client.BusinessDetails = new RestaurantBusinessDetails
                    {
                        Name = client.Name,
                        Theme = "modern",
                        ThemeUpdated = false
                    };
                }
            }

            // Update durations on existing services
            if (request.ServiceDurations != null)
            {
                foreach (var sub in client.Subscriptions)
                {
                    if (request.ServiceDurations.TryGetValue(sub.ServiceKey, out var months))
                    {
                        sub.DurationMonths = months;
                        sub.ExpireAtUtc = client.CreatedAtUtc.AddMonths(months);
                    }
                }
            }
        }

        // If password is updated, update identity user
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.ClientId == client.Id);
            if (user != null)
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                await _userManager.ResetPasswordAsync(user, token, request.Password);
            }
            else if (!string.IsNullOrWhiteSpace(client.Email))
            {
                var newUser = new ApplicationUser
                {
                    UserName = client.Email,
                    Email = client.Email,
                    FullName = client.Name,
                    UserType = UserRole.Client,
                    ClientId = client.Id,
                    IsActive = true
                };
                await _userManager.CreateAsync(newUser, request.Password);
                await _userManager.AddToRoleAsync(newUser, UserRole.Client);
            }
        }

        await _context.SaveChangesAsync();
        return await GetClientByIdAsync(client.Id);
    }

    public async Task<bool> DeleteClientAsync(Guid id)
    {
        var client = await _context.Clients
            .Include(c => c.Subscriptions)
            .Include(c => c.BusinessDetails)
            .Include(c => c.Categories)
            .Include(c => c.DishTypes)
            .Include(c => c.Dishes)
            .Include(c => c.PersonalProfile)
                .ThenInclude(p => p!.Links)
            .Include(c => c.Inquiries)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null) return false;

        // Delete associated user
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.ClientId == client.Id);
        if (user != null)
        {
            await _userManager.DeleteAsync(user);
        }

        // Explicitly remove related sets to avoid restrict/cascade issues
        _context.Dishes.RemoveRange(client.Dishes);
        _context.Categories.RemoveRange(client.Categories);
        _context.DishTypes.RemoveRange(client.DishTypes);
        if (client.BusinessDetails != null) _context.RestaurantBusinessDetails.Remove(client.BusinessDetails);
        if (client.PersonalProfile != null)
        {
            _context.CallToActionLinks.RemoveRange(client.PersonalProfile.Links);
            _context.PersonalQrProfiles.Remove(client.PersonalProfile);
        }
        _context.Inquiries.RemoveRange(client.Inquiries);
        _context.ClientServiceSubscriptions.RemoveRange(client.Subscriptions);

        _context.Clients.Remove(client);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> GetClientStatusAsync(Guid id)
    {
        return await _context.Clients
            .Where(c => c.Id == id)
            .Select(c => c.IsActive)
            .FirstOrDefaultAsync();
    }

    public async Task<bool> ToggleClientStatusAsync(Guid id, bool isClientSelfToggle = false)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client == null) return false;

        client.IsActive = !client.IsActive;

        // When toggled by Admin, also activate/deactivate the user account.
        // When toggled by client owner, keep user.IsActive true so owner can log in to manage/reactivate.
        if (!isClientSelfToggle)
        {
            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.ClientId == client.Id);
            if (user != null)
            {
                user.IsActive = client.IsActive;
            }
        }

        await _context.SaveChangesAsync();
        return client.IsActive;
    }

    public async Task<bool> ToggleServiceSuspensionAsync(Guid id, string serviceName)
    {
        var sub = await _context.ClientServiceSubscriptions
            .FirstOrDefaultAsync(s => s.ClientId == id && s.ServiceKey == serviceName);

        if (sub == null) return false;

        sub.IsSuspended = !sub.IsSuspended;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveServiceFromClientAsync(Guid id, string serviceName)
    {
        var client = await _context.Clients
            .Include(c => c.Subscriptions)
            .Include(c => c.BusinessDetails)
            .Include(c => c.Categories)
            .Include(c => c.Dishes)
            .Include(c => c.PersonalProfile)
                .ThenInclude(p => p!.Links)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null) return false;

        var sub = client.Subscriptions.FirstOrDefault(s => s.ServiceKey == serviceName);
        if (sub != null)
        {
            _context.ClientServiceSubscriptions.Remove(sub);
        }

        if (serviceName == ServiceType.RestaurantMenu)
        {
            if (client.BusinessDetails != null) _context.RestaurantBusinessDetails.Remove(client.BusinessDetails);
            _context.Dishes.RemoveRange(client.Dishes);
            _context.Categories.RemoveRange(client.Categories);
            _context.DishTypes.RemoveRange(client.DishTypes);
        }
        else if (serviceName == ServiceType.PersonalQr)
        {
            if (client.PersonalProfile != null)
            {
                _context.CallToActionLinks.RemoveRange(client.PersonalProfile.Links);
                _context.PersonalQrProfiles.Remove(client.PersonalProfile);
            }
            client.PersonalQrToken = null;
        }

        // If no services remain, remove client
        if (client.Subscriptions.Count <= 1) // Since sub is already marked for removal
        {
            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.ClientId == client.Id);
            if (user != null) await _userManager.DeleteAsync(user);
            _context.Clients.Remove(client);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkSetupCompleteAsync(Guid id, string? serviceName = null)
    {
        var subs = await _context.ClientServiceSubscriptions
            .Where(s => s.ClientId == id)
            .ToListAsync();

        if (serviceName != null)
        {
            var target = subs.FirstOrDefault(s => s.ServiceKey == serviceName);
            if (target != null) target.IsSetupCompleted = true;
        }
        else
        {
            foreach (var s in subs) s.IsSetupCompleted = true;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AdminStatsDto> GetAdminStatsAsync()
    {
        var clients = await _context.Clients
            .Include(c => c.Subscriptions)
            .ToListAsync();

        var total = clients.Count;
        var active = clients.Count(c => c.IsActive);

        // Revenue calculation matching frontend: 1200 for restaurant_menu, 800 for personal_qr per month
        decimal revenue = 0;
        foreach (var c in clients)
        {
            foreach (var sub in c.Subscriptions)
            {
                var pricePerMonth = sub.ServiceKey == ServiceType.RestaurantMenu ? 1200 : 800;
                revenue += pricePerMonth * sub.DurationMonths;
            }
        }

        return new AdminStatsDto
        {
            Total = total,
            Active = active,
            Revenue = revenue
        };
    }

    private static ClientDto MapToClientDto(Client c)
    {
        var services = c.Subscriptions.Select(s => s.ServiceKey).ToList();
        var durations = c.Subscriptions.ToDictionary(s => s.ServiceKey, s => s.DurationMonths);
        var expiries = c.Subscriptions.ToDictionary(s => s.ServiceKey, s => s.ExpireAtUtc.ToString("yyyy-MM-ddTHH:mm:ssZ"));
        var maxExpiry = c.Subscriptions.OrderByDescending(s => s.ExpireAtUtc).FirstOrDefault()?.ExpireAtUtc.ToString("yyyy-MM-ddTHH:mm:ssZ")
            ?? c.CreatedAtUtc.AddMonths(1).ToString("yyyy-MM-ddTHH:mm:ssZ");

        var suspendedServices = c.Subscriptions.Where(s => s.IsSuspended).Select(s => s.ServiceKey).ToList();

        // Calculate completed setups dynamically: full setup requires all required details
        var completedSetups = new List<string>();
        if (c.Subscriptions.Any(s => s.ServiceKey == ServiceType.RestaurantMenu))
        {
            var isMarked = c.Subscriptions.Any(s => s.ServiceKey == ServiceType.RestaurantMenu && s.IsSetupCompleted);
            var hasBusiness = !string.IsNullOrEmpty(c.BusinessDetails?.Name);
            var hasCategories = c.Categories != null && c.Categories.Any();
            var hasDishes = c.Dishes != null && c.Dishes.Any();

            // Full setup for Restaurant Menu requires Business Profile, Categories, and Dishes
            if ((hasBusiness && hasCategories && hasDishes) || (isMarked && (hasCategories || hasDishes)))
            {
                completedSetups.Add(ServiceType.RestaurantMenu);
            }
        }

        if (c.Subscriptions.Any(s => s.ServiceKey == ServiceType.PersonalQr))
        {
            var isMarked = c.Subscriptions.Any(s => s.ServiceKey == ServiceType.PersonalQr && s.IsSetupCompleted);
            var p = c.PersonalProfile;
            var hasProfile = p != null && (!string.IsNullOrEmpty(p.Bio) || !string.IsNullOrEmpty(p.ProfilePicUrl) || !string.IsNullOrEmpty(p.Designation));
            var hasLinks = p != null && p.Links != null && p.Links.Any();

            // Full setup for Personal QR requires Profile Details and CTA Links
            if ((hasProfile && hasLinks) || (isMarked && (hasProfile || hasLinks)))
            {
                completedSetups.Add(ServiceType.PersonalQr);
            }
        }

        return new ClientDto
        {
            Id = c.Id.ToString(),
            Name = c.Name,
            Email = c.Email,
            Services = services,
            ServiceDurations = durations,
            ServiceExpiries = expiries,
            ExpireAt = maxExpiry,
            QrToken = c.QrToken,
            PersonalQrToken = c.PersonalQrToken,
            Theme = c.BusinessDetails?.Theme ?? "modern",
            ThemeUpdated = c.BusinessDetails?.ThemeUpdated ?? false,
            IsActive = c.IsActive,
            IsServiceSuspended = suspendedServices.Count > 0,
            SuspendedServices = suspendedServices,
            CompletedSetups = completedSetups,
            IsSetupComplete = completedSetups.Count > 0,
            ScanCount = c.ScanCount,
            CreatedAt = c.CreatedAtUtc,
            BusinessDetails = c.BusinessDetails == null ? null : new BusinessDetailsDto
            {
                Name = c.BusinessDetails.Name,
                Phone = c.BusinessDetails.Phone,
                Address = c.BusinessDetails.Address,
                Logo = c.BusinessDetails.LogoUrl,
                Theme = c.BusinessDetails.Theme
            }
        };
    }
}
