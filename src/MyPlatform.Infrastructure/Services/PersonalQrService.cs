using Microsoft.EntityFrameworkCore;
using MyPlatform.Application.DTOs.PersonalQr;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Entities;
using MyPlatform.Infrastructure.Persistence;

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
            var pToken = "card-" + Guid.NewGuid().ToString("N")[..8];
            profile = new PersonalQrProfile
            {
                ClientId = clientId,
                QrToken = pToken,
                Theme = "minimal"
            };
            _context.PersonalQrProfiles.Add(profile);

            // Also update client.PersonalQrToken
            var client = await _context.Clients.FindAsync(clientId);
            if (client != null && string.IsNullOrEmpty(client.PersonalQrToken))
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

                if (existing != null)
                {
                    existing.Title = linkDto.Title;
                    existing.Url = linkDto.Url;
                    existing.Icon = string.IsNullOrEmpty(linkDto.Icon) ? "globe" : linkDto.Icon;
                    existing.Clicks = linkDto.Clicks;
                    existing.DisplayOrder = order++;
                    existing.IsActive = linkDto.IsActive && (linkDto.IsEnabled ?? true);
                    existing.UpdatedAtUtc = DateTime.UtcNow;
                }
                else
                {
                    var newLink = new CallToActionLink
                    {
                        ProfileId = profile.Id,
                        Title = linkDto.Title,
                        Url = linkDto.Url,
                        Icon = string.IsNullOrEmpty(linkDto.Icon) ? "globe" : linkDto.Icon,
                        Clicks = linkDto.Clicks,
                        DisplayOrder = order++,
                        IsActive = linkDto.IsActive && (linkDto.IsEnabled ?? true),
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
        };
    }
}
