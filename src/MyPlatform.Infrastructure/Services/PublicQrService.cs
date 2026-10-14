using Microsoft.EntityFrameworkCore;
using MyPlatform.Application.DTOs.Clients;
using MyPlatform.Application.DTOs.PersonalQr;
using MyPlatform.Application.DTOs.Public;
using MyPlatform.Application.DTOs.RestaurantMenu;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Entities;
using MyPlatform.Domain.Enums;
using MyPlatform.Infrastructure.Persistence;

namespace MyPlatform.Infrastructure.Services;

public class PublicQrService : IPublicQrService
{
    private readonly ApplicationDbContext _context;

    public PublicQrService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TokenIdentifyResponseDto> IdentifyTokenAsync(string token)
    {
        // 1. Check Personal QR tokens
        var isPersonalQr = await _context.PersonalQrProfiles.AnyAsync(p => p.QrToken == token);
        if (isPersonalQr)
        {
            return new TokenIdentifyResponseDto { Type = ServiceType.PersonalQr };
        }

        // 2. Check Restaurant Menu tokens
        var isRestaurant = await _context.Clients.AnyAsync(c => c.QrToken == token);
        if (isRestaurant)
        {
            return new TokenIdentifyResponseDto { Type = ServiceType.RestaurantMenu };
        }

        throw new KeyNotFoundException("Invalid Token");
    }

    public async Task<PublicMenuResponseDto> GetPublicMenuByTokenAsync(string token)
    {
        var client = await _context.Clients
            .Include(c => c.Subscriptions)
            .Include(c => c.BusinessDetails)
            .FirstOrDefaultAsync(c => c.QrToken == token);

        if (client == null)
        {
            throw new KeyNotFoundException("Invalid QR Token.");
        }

        var isSuspended = client.Subscriptions.Any(s => s.ServiceKey == ServiceType.RestaurantMenu && s.IsSuspended);
        if (isSuspended)
        {
            throw new InvalidOperationException("Service Suspended by Admin");
        }

        if (!client.IsActive)
        {
            throw new InvalidOperationException("This menu is currently deactivated by the restaurant owner.");
        }

        var categories = await _context.Categories
            .Where(c => c.ClientId == client.Id)
            .OrderBy(c => c.CreatedAtUtc)
            .ToListAsync();

        var dishes = await _context.Dishes
            .Where(d => d.ClientId == client.Id && d.IsActive)
            .OrderBy(d => d.CreatedAtUtc)
            .ToListAsync();

        return new PublicMenuResponseDto
        {
            Client = new ClientDto
            {
                Id = client.Id.ToString(),
                Name = client.Name,
                Email = client.Email,
                QrToken = client.QrToken,
                Theme = client.BusinessDetails?.Theme ?? "modern",
                ScanCount = client.ScanCount,
                BusinessDetails = client.BusinessDetails == null ? null : new BusinessDetailsDto
                {
                    Name = client.BusinessDetails.Name,
                    Phone = client.BusinessDetails.Phone,
                    Address = client.BusinessDetails.Address,
                    Logo = client.BusinessDetails.LogoUrl,
                    Theme = client.BusinessDetails.Theme
                }
            },
            Categories = categories.Select(c => new CategoryDto
            {
                Id = c.Id.ToString(),
                Name = c.Name,
                ClientId = c.ClientId.ToString()
            }).ToList(),
            Dishes = dishes.Select(d => new DishDto
            {
                Id = d.Id.ToString(),
                Name = d.Name,
                Price = d.Price,
                Quantity = d.Quantity,
                Type = d.Type,
                Description = d.Description,
                CategoryId = d.CategoryId.ToString(),
                Image = d.ImageUrl,
                IsActive = d.IsActive
            }).ToList()
        };
    }

    public async Task<PublicPersonalCardResponseDto> GetPublicPersonalCardByTokenAsync(string token)
    {
        var profile = await _context.PersonalQrProfiles
            .Include(p => p.Links)
            .Include(p => p.Client)
                .ThenInclude(c => c.Subscriptions)
            .FirstOrDefaultAsync(p => p.QrToken == token);

        if (profile == null)
        {
            throw new KeyNotFoundException("Invalid QR Token.");
        }

        var client = profile.Client;
        var isSuspended = client.Subscriptions.Any(s => s.ServiceKey == ServiceType.PersonalQr && s.IsSuspended);
        if (isSuspended)
        {
            throw new InvalidOperationException("Service Suspended by Admin");
        }

        if (!client.IsActive)
        {
            throw new InvalidOperationException("This profile is currently deactivated.");
        }

        return new PublicPersonalCardResponseDto
        {
            Client = new ClientDto
            {
                Id = client.Id.ToString(),
                Name = client.Name,
                Email = client.Email,
                PersonalQrToken = profile.QrToken,
                IsActive = client.IsActive
            },
            Profile = new PersonalQrProfileDto
            {
                Id = profile.Id.ToString(),
                ClientId = client.Id.ToString(),
                QrToken = profile.QrToken,
                FirstName = profile.FirstName,
                LastName = profile.LastName,
                Designation = profile.Designation,
                Bio = profile.Bio,
                ProfilePic = profile.ProfilePicUrl,
                Theme = profile.Theme,
                Education10th = profile.Education10th,
                Education12th = profile.Education12th,
                EducationCollege = profile.EducationCollege,
                EducationMasters = profile.EducationMasters,
                EducationPhD = profile.EducationPhD,
                Links = profile.Links
                    .Where(l => l.IsActive)
                    .OrderBy(l => l.DisplayOrder)
                    .Select(l => new CallToActionLinkDto
                    {
                        Id = l.Id.ToString(),
                        Title = l.Title,
                        Url = l.Url,
                        Icon = l.Icon,
                        Clicks = l.Clicks,
                        DisplayOrder = l.DisplayOrder,
                        IsActive = l.IsActive,
                        IsEnabled = l.IsActive
                    }).ToList()
            }
        };
    }

    public async Task<bool> IncrementScanCountAsync(string token)
    {
        // 1. Check if token is restaurant menu token
        var client = await _context.Clients.FirstOrDefaultAsync(c => c.QrToken == token);
        if (client != null)
        {
            client.ScanCount++;
            await _context.SaveChangesAsync();
            return true;
        }

        // 2. Check if token is personal qr token
        var profile = await _context.PersonalQrProfiles
            .Include(p => p.Client)
            .FirstOrDefaultAsync(p => p.QrToken == token);

        if (profile != null)
        {
            profile.Client.ScanCount++;
            await _context.SaveChangesAsync();
            return true;
        }

        return false;
    }

    public async Task<bool> IncrementLinkClickAsync(string token, Guid linkId)
    {
        var profile = await _context.PersonalQrProfiles.FirstOrDefaultAsync(p => p.QrToken == token);
        if (profile == null) return false;

        var link = await _context.CallToActionLinks
            .FirstOrDefaultAsync(l => l.Id == linkId && l.ProfileId == profile.Id);

        if (link == null) return false;

        link.Clicks++;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SubmitInquiryAsync(string token, CreateInquiryDto dto)
    {
        var profile = await _context.PersonalQrProfiles.FirstOrDefaultAsync(p => p.QrToken == token);
        if (profile == null)
        {
            throw new KeyNotFoundException("Invalid QR Token.");
        }

        var inquiry = new Inquiry
        {
            ClientId = profile.ClientId,
            Name = dto.Name,
            Email = dto.Email ?? string.Empty,
            Phone = dto.Phone ?? string.Empty,
            Message = dto.Message ?? string.Empty
        };

        _context.Inquiries.Add(inquiry);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> GetScanCountByClientIdAsync(Guid clientId)
    {
        var client = await _context.Clients.FindAsync(clientId);
        return client?.ScanCount ?? 0;
    }
}
