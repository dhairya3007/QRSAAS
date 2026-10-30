using Microsoft.EntityFrameworkCore;
using MyPlatform.Application.DTOs.PersonalQr;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Entities;
using MyPlatform.Domain.Enums;
using MyPlatform.Infrastructure.Persistence;
using System.Text.Json;

namespace MyPlatform.Infrastructure.Services;

public class PersonalQrService : IPersonalQrService
{
    private readonly ApplicationDbContext _context;

    public PersonalQrService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PersonalQrProfileDto?> GetPersonalQrProfileAsync(Guid clientId)
    {
        var profile = await _context.PersonalQrProfiles
            .Include(p => p.Links)
            .FirstOrDefaultAsync(p => p.ClientId == clientId);

        if (profile == null) return null;

        return MapToDto(profile);
    }

    public async Task<PersonalQrProfileDto> UpdatePersonalQrProfileAsync(Guid clientId, UpdatePersonalQrProfileDto dto)
    {
        var profile = await _context.PersonalQrProfiles
            .Include(p => p.Links)
            .FirstOrDefaultAsync(p => p.ClientId == clientId);

        if (profile == null)
        {
            // Verify client exists and has a Personal QR subscription before creating a profile
            var client = await _context.Clients
                .Include(c => c.Subscriptions)
                .FirstOrDefaultAsync(c => c.Id == clientId);

            if (client == null)
            {
                throw new KeyNotFoundException("Client not found.");
            }

            var hasSubscription = client.Subscriptions.Any(s => s.ServiceKey == ServiceType.PersonalQr);
            if (!hasSubscription)
            {
                throw new InvalidOperationException("Client does not have an active Personal QR service subscription.");
            }

            var pToken = "card-" + Guid.NewGuid().ToString("N")[..8];
            profile = new PersonalQrProfile
            {
                ClientId = clientId,
                QrToken = pToken,
                Theme = "minimal"
            };
            _context.PersonalQrProfiles.Add(profile);

            // Also update client.PersonalQrToken
            if (string.IsNullOrEmpty(client.PersonalQrToken))
            {
                client.PersonalQrToken = pToken;
            }
        }

        if (dto.FirstName != null) profile.FirstName = dto.FirstName;
        if (dto.LastName != null) profile.LastName = dto.LastName;
        if (dto.Designation != null) profile.Designation = dto.Designation;
        if (dto.Bio != null) profile.Bio = dto.Bio;
        if (dto.ProfilePic != null) profile.ProfilePicUrl = dto.ProfilePic;
        if (dto.Theme != null) profile.Theme = dto.Theme;
        if (dto.Education10th != null) profile.Education10th = dto.Education10th;
        if (dto.Education12th != null) profile.Education12th = dto.Education12th;
        if (dto.EducationCollege != null) profile.EducationCollege = dto.EducationCollege;
        if (dto.EducationMasters != null) profile.EducationMasters = dto.EducationMasters;
        if (dto.EducationPhD != null) profile.EducationPhD = dto.EducationPhD;

        // Sync CTA links if provided
        if (dto.Links != null)
        {
            var incomingIds = dto.Links
                .Where(l => !string.IsNullOrEmpty(l.Id) && Guid.TryParse(l.Id, out _))
                .Select(l => Guid.Parse(l.Id))
                .ToHashSet();

            // Remove links that are no longer in incoming list
            var linksToRemove = profile.Links.Where(l => !incomingIds.Contains(l.Id)).ToList();
            if (linksToRemove.Count > 0)
            {
                _context.CallToActionLinks.RemoveRange(linksToRemove);
            }

            // Update existing or add new
            int order = 0;
            foreach (var linkDto in dto.Links)
            {
                var isExisting = Guid.TryParse(linkDto.Id, out var parsedId);
                var existing = isExisting ? profile.Links.FirstOrDefault(l => l.Id == parsedId) : null;

                var title = !string.IsNullOrWhiteSpace(linkDto.CustomLabel)
                    ? linkDto.CustomLabel
                    : (!string.IsNullOrWhiteSpace(linkDto.Title) ? linkDto.Title : (linkDto.Type ?? "Link"));

                var url = !string.IsNullOrWhiteSpace(linkDto.Value)
                    ? linkDto.Value
                    : (linkDto.Url ?? string.Empty);

                var category = !string.IsNullOrWhiteSpace(linkDto.Category) ? linkDto.Category : "Social Media";
                var type = !string.IsNullOrWhiteSpace(linkDto.Type) ? linkDto.Type : "Website";
                var icon = !string.IsNullOrWhiteSpace(linkDto.Icon) ? linkDto.Icon : "globe";

                string? configJson = null;
                if (!string.IsNullOrEmpty(linkDto.CountryCode) ||
                    !string.IsNullOrEmpty(linkDto.RichText) ||
                    linkDto.File != null ||
                    (linkDto.MediaItems != null && linkDto.MediaItems.Count > 0))
                {
                    configJson = JsonSerializer.Serialize(new CtaDynamicConfig
                    {
                        CountryCode = linkDto.CountryCode,
                        RichText = linkDto.RichText,
                        File = linkDto.File,
                        MediaItems = linkDto.MediaItems
                    });
                }

                if (existing != null)
                {
                    existing.Category = category;
                    existing.Type = type;
                    existing.Title = title;
                    existing.Url = url;
                    existing.Icon = icon;
                    existing.Clicks = linkDto.Clicks;
                    existing.DisplayOrder = order++;
                    existing.IsActive = linkDto.IsActive && (linkDto.IsEnabled ?? true);
                    existing.ConfigJson = configJson;
                    existing.UpdatedAtUtc = DateTime.UtcNow;
                }
                else
                {
                    var newLink = new CallToActionLink
                    {
                        ProfileId = profile.Id,
                        Category = category,
                        Type = type,
                        Title = title,
                        Url = url,
                        Icon = icon,
                        Clicks = linkDto.Clicks,
                        DisplayOrder = order++,
                        IsActive = linkDto.IsActive && (linkDto.IsEnabled ?? true),
                        ConfigJson = configJson,
                        CreatedAtUtc = DateTime.UtcNow
                    };
                    _context.CallToActionLinks.Add(newLink);
                }
            }
        }

        profile.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return (await GetPersonalQrProfileAsync(clientId)) ?? MapToDto(profile);
    }

    public async Task<bool> UpdatePersonalQrThemeAsync(Guid clientId, string themeId)
    {
        var profile = await _context.PersonalQrProfiles
            .FirstOrDefaultAsync(p => p.ClientId == clientId);

        if (profile == null) return false;

        profile.Theme = themeId;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<InquiryDto>> GetInquiriesAsync(Guid clientId)
    {
        var inquiries = await _context.Inquiries
            .Where(i => i.ClientId == clientId)
            .OrderByDescending(i => i.CreatedAtUtc)
            .ToListAsync();

        return inquiries.Select(i => new InquiryDto
        {
            Id = i.Id.ToString(),
            ClientId = i.ClientId.ToString(),
            Name = i.Name,
            Email = i.Email,
            Phone = i.Phone,
            Message = i.Message,
            CreatedAt = i.CreatedAtUtc
        }).ToList();
    }

    public async Task<bool> DeleteInquiryAsync(Guid clientId, Guid inquiryId)
    {
        var inquiry = await _context.Inquiries
            .FirstOrDefaultAsync(i => i.Id == inquiryId && i.ClientId == clientId);

        if (inquiry == null) return false;

        _context.Inquiries.Remove(inquiry);
        await _context.SaveChangesAsync();
        return true;
    }

    private static PersonalQrProfileDto MapToDto(PersonalQrProfile p)
    {
        return new PersonalQrProfileDto
        {
            Id = p.Id.ToString(),
            ClientId = p.ClientId.ToString(),
            QrToken = p.QrToken,
            FirstName = p.FirstName,
            LastName = p.LastName,
            Designation = p.Designation,
            Bio = p.Bio,
            ProfilePic = p.ProfilePicUrl,
            Theme = p.Theme,
            Education10th = p.Education10th,
            Education12th = p.Education12th,
            EducationCollege = p.EducationCollege,
            EducationMasters = p.EducationMasters,
            EducationPhD = p.EducationPhD,
            Links = p.Links
                .OrderBy(l => l.DisplayOrder)
                .Select(l =>
                {
                    CtaDynamicConfig? config = null;
                    if (!string.IsNullOrEmpty(l.ConfigJson))
                    {
                        try
                        {
                            config = JsonSerializer.Deserialize<CtaDynamicConfig>(l.ConfigJson);
                        }
                        catch { }
                    }

                    return new CallToActionLinkDto
                    {
                        Id = l.Id.ToString(),
                        Category = l.Category,
                        Type = l.Type,
                        Title = l.Title,
                        CustomLabel = l.Title,
                        Url = l.Url,
                        Value = l.Url,
                        Icon = l.Icon,
                        Clicks = l.Clicks,
                        DisplayOrder = l.DisplayOrder,
                        IsActive = l.IsActive,
                        IsEnabled = l.IsActive,
                        CountryCode = config?.CountryCode,
                        RichText = config?.RichText,
                        File = config?.File,
                        MediaItems = config?.MediaItems ?? new List<CtaMediaItemDto>()
                    };
                }).ToList()
        };
    }
}
