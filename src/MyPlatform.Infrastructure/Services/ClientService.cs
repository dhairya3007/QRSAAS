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
    private readonly IJwtTokenService _jwtTokenService;

    public ClientService(ApplicationDbContext context, UserManager<ApplicationUser> userManager, IJwtTokenService jwtTokenService)
    {
        _context = context;
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<List<ClientDto>> GetAllClientsAsync()
    {
        var rawClients = await _context.Clients
            .AsNoTracking()
            .AsSplitQuery()
            .OrderByDescending(c => c.CreatedAtUtc)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Email,
                c.QrToken,
                c.PersonalQrToken,
                c.IsActive,
                c.ScanCount,
                c.CreatedAtUtc,
                Subscriptions = c.Subscriptions.Select(s => new
                {
                    s.ServiceKey,
                    s.DurationMonths,
                    s.ExpireAtUtc,
                    s.IsSuspended,
                    s.IsSetupCompleted
                }).ToList(),
                BusinessDetails = c.BusinessDetails == null ? null : new
                {
                    c.BusinessDetails.Name,
                    c.BusinessDetails.Phone,
                    c.BusinessDetails.Address,
                    c.BusinessDetails.LogoUrl,
                    c.BusinessDetails.Theme,
                    c.BusinessDetails.ThemeUpdated
                },
                HasCategories = c.Categories.Any(),
                HasDishes = c.Dishes.Any(),
                PersonalProfile = c.PersonalProfile == null ? null : new
                {
                    c.PersonalProfile.Bio,
                    c.PersonalProfile.ProfilePicUrl,
                    c.PersonalProfile.Designation,
                    HasLinks = c.PersonalProfile.Links.Any()
                }
            })
            .ToListAsync();

        return rawClients.Select(c =>
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
                var hasCategories = c.HasCategories;
                var hasDishes = c.HasDishes;

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
                var hasLinks = p != null && p.HasLinks;

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
                SetupToken = completedSetups.Count > 0 ? null : _jwtTokenService.GenerateSetupToken(c.Id, c.Name),
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
        }).ToList();
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

        // --- Transaction: save both Client and Identity user together ---
        // If Identity user creation fails, the client row is rolled back automatically.
        // Without this, a failed user creation would leave an orphaned unloggable client in the DB.
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
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
                if (!userResult.Succeeded)
                {
                    // User creation failed — roll back the client too so nothing is orphaned
                    await transaction.RollbackAsync();
                    var errors = string.Join(", ", userResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to create login account: {errors}");
                }

                await _userManager.AddToRoleAsync(user, UserRole.Client);
            }

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw; // re-throw so the controller returns a proper error response
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

        // Update services if passed — only adding new services is permitted here.
        // Existing services can ONLY be removed from their individual service dashboard.
        if (request.Services != null)
        {
            var currentServices = client.Subscriptions.Select(s => s.ServiceKey).ToList();
            var newServices = request.Services;

            // 1. Add new services
            var durations = request.ServiceDurations ?? new Dictionary<string, int>();
            foreach (var sKey in newServices.Except(currentServices))
            {
                var months = durations.TryGetValue(sKey, out var m) ? m : 1;
                var newSub = new ClientServiceSubscription
                {
                    ClientId = client.Id,
                    ServiceKey = sKey,
                    DurationMonths = months,
                    ExpireAtUtc = DateTime.UtcNow.AddMonths(months),
                    IsSuspended = false,
                    IsSetupCompleted = false,
                    ScanCount = 0
                };
                _context.ClientServiceSubscriptions.Add(newSub);

                if (sKey == ServiceType.PersonalQr)
                {
                    if (string.IsNullOrWhiteSpace(client.PersonalQrToken))
                    {
                        var pToken = "card-" + Guid.NewGuid().ToString("N")[..8];
                        client.PersonalQrToken = pToken;
                    }

                    if (client.PersonalProfile == null)
                    {
                        var pProfile = new PersonalQrProfile
                        {
                            ClientId = client.Id,
                            QrToken = client.PersonalQrToken!,
                            FirstName = client.Name,
                            Theme = "minimal"
                        };
                        client.PersonalProfile = pProfile;
                        _context.PersonalQrProfiles.Add(pProfile);
                    }
                }

                if (sKey == ServiceType.RestaurantMenu)
                {
                    if (string.IsNullOrWhiteSpace(client.QrToken))
                    {
                        client.QrToken = "qr-" + Guid.NewGuid().ToString("N")[..10];
                    }

                    if (client.BusinessDetails == null)
                    {
                        var bDetails = new RestaurantBusinessDetails
                        {
                            ClientId = client.Id,
                            Name = client.Name,
                            Theme = "modern",
                            ThemeUpdated = false
                        };
                        client.BusinessDetails = bDetails;
                        _context.RestaurantBusinessDetails.Add(bDetails);
                    }
                }
            }

            // 3. Update durations ONLY on existing surviving services
            if (request.ServiceDurations != null)
            {
                var existingServicesToUpdate = currentServices.Intersect(newServices).ToList();
                foreach (var sub in client.Subscriptions.Where(s => existingServicesToUpdate.Contains(s.ServiceKey)))
                {
                    if (request.ServiceDurations.TryGetValue(sub.ServiceKey, out var months) && months > 0)
                    {
                        sub.DurationMonths = months;
                        sub.ExpireAtUtc = DateTime.UtcNow.AddMonths(months);
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
                var resetResult = await _userManager.ResetPasswordAsync(user, token, request.Password);
                if (!resetResult.Succeeded)
                {
                    var errors = string.Join(", ", resetResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to update password: {errors}");
                }
            }
            else if (!string.IsNullOrWhiteSpace(client.Email))
            {
                var existingUser = await _userManager.FindByEmailAsync(client.Email);
                if (existingUser != null)
                {
                    existingUser.ClientId = client.Id;
                    var token = await _userManager.GeneratePasswordResetTokenAsync(existingUser);
                    var resetResult = await _userManager.ResetPasswordAsync(existingUser, token, request.Password);
                    if (!resetResult.Succeeded)
                    {
                        var errors = string.Join(", ", resetResult.Errors.Select(e => e.Description));
                        throw new InvalidOperationException($"Failed to update password: {errors}");
                    }
                }
                else
                {
                    var newUser = new ApplicationUser
                    {
                        UserName = client.Email,
                        Email = client.Email,
                        FullName = client.Name,
                        UserType = UserRole.Client,
                        ClientId = client.Id,
                        IsActive = true,
                        EmailConfirmed = true
                    };
                    var createResult = await _userManager.CreateAsync(newUser, request.Password);
                    if (!createResult.Succeeded)
                    {
                        var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                        throw new InvalidOperationException($"Failed to create user account: {errors}");
                    }
                    await _userManager.AddToRoleAsync(newUser, UserRole.Client);
                }
            }
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new InvalidOperationException("This client or one of its services was modified or deleted by another action. Please refresh the page.");
        }
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

        // 1. Delete associated identity user
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.ClientId == client.Id);
        if (user != null)
        {
            await _userManager.DeleteAsync(user);
        }

        // 2. Strict deletion order: Delete dishes FIRST so foreign keys to Categories/DishTypes are released
        if (client.Dishes != null && client.Dishes.Any())
        {
            _context.Dishes.RemoveRange(client.Dishes);
        }

        // 3. Delete categories & dish types safely after dishes are cleared
        if (client.Categories != null && client.Categories.Any())
        {
            _context.Categories.RemoveRange(client.Categories);
        }

        if (client.DishTypes != null && client.DishTypes.Any())
        {
            _context.DishTypes.RemoveRange(client.DishTypes);
        }

        // 4. Restaurant business details
        if (client.BusinessDetails != null)
        {
            _context.RestaurantBusinessDetails.Remove(client.BusinessDetails);
        }

        // 5. Personal QR profile & CTA links
        if (client.PersonalProfile != null)
        {
            if (client.PersonalProfile.Links != null && client.PersonalProfile.Links.Any())
            {
                _context.CallToActionLinks.RemoveRange(client.PersonalProfile.Links);
            }
            _context.PersonalQrProfiles.Remove(client.PersonalProfile);
        }

        // 6. Inquiries and Subscriptions
        if (client.Inquiries != null && client.Inquiries.Any())
        {
            _context.Inquiries.RemoveRange(client.Inquiries);
        }

        if (client.Subscriptions != null && client.Subscriptions.Any())
        {
            _context.ClientServiceSubscriptions.RemoveRange(client.Subscriptions);
        }

        // 7. Finally remove the client itself
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
            client.Subscriptions.Remove(sub);                  // keep in-memory list accurate for count check below
            _context.ClientServiceSubscriptions.Remove(sub);   // mark for deletion in DB
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
        // client.Subscriptions is now accurate (sub was removed above) — no stale count
        if (!client.Subscriptions.Any())
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
        var total = await _context.Clients.CountAsync();
        var active = await _context.Clients.CountAsync(c => c.IsActive);

        var subs = await _context.ClientServiceSubscriptions
            .AsNoTracking()
            .Select(s => new { s.ServiceKey, s.DurationMonths })
            .ToListAsync();

        decimal revenue = 0;
        foreach (var sub in subs)
        {
            var pricePerMonth = sub.ServiceKey == ServiceType.RestaurantMenu ? 1200 : 800;
            revenue += pricePerMonth * sub.DurationMonths;
        }

        return new AdminStatsDto
        {
            Total = total,
            Active = active,
            Revenue = revenue
        };
    }

    private ClientDto MapToClientDto(Client c)
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
            SetupToken = completedSetups.Count > 0 ? null : _jwtTokenService.GenerateSetupToken(c.Id, c.Name),
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
