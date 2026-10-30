using Microsoft.EntityFrameworkCore;
using MyPlatform.Application.DTOs.Clients;
using MyPlatform.Application.DTOs.RestaurantMenu;
using MyPlatform.Application.Interfaces;
using MyPlatform.Domain.Entities;
using MyPlatform.Infrastructure.Persistence;

namespace MyPlatform.Infrastructure.Services;

public class RestaurantMenuService : IRestaurantMenuService
{
    private readonly ApplicationDbContext _context;

    public RestaurantMenuService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<BusinessDetailsDto> GetBusinessDetailsAsync(Guid clientId)
    {
        var details = await _context.RestaurantBusinessDetails
            .FirstOrDefaultAsync(b => b.ClientId == clientId);

        if (details == null)
        {
            var client = await _context.Clients.FindAsync(clientId);
            return new BusinessDetailsDto
            {
                Name = client?.Name ?? string.Empty,
                Theme = "modern"
            };
        }

        return new BusinessDetailsDto
        {
            Name = details.Name,
            Phone = details.Phone,
            Address = details.Address,
            Logo = details.LogoUrl,
            Theme = details.Theme
        };
    }

    public async Task<BusinessDetailsDto> SaveBusinessDetailsAsync(Guid clientId, SaveBusinessDetailsDto dto)
    {
        var details = await _context.RestaurantBusinessDetails
            .FirstOrDefaultAsync(b => b.ClientId == clientId);

        if (details == null)
        {
            details = new RestaurantBusinessDetails
            {
                ClientId = clientId,
                Name = dto.Name,
                Phone = dto.Phone,
                Address = dto.Address,
                LogoUrl = dto.Logo,
                Theme = "modern",
                ThemeUpdated = true
            };
            _context.RestaurantBusinessDetails.Add(details);
        }
        else
        {
            details.Name = dto.Name;
            details.Phone = dto.Phone;
            details.Address = dto.Address;
            if (dto.Logo != null) details.LogoUrl = dto.Logo;
            details.ThemeUpdated = true;
        }

        await _context.SaveChangesAsync();
        return await GetBusinessDetailsAsync(clientId);
    }

    public async Task<bool> UpdateThemeAsync(Guid clientId, string theme)
    {
        var details = await _context.RestaurantBusinessDetails
            .FirstOrDefaultAsync(b => b.ClientId == clientId);

        if (details == null)
        {
            var client = await _context.Clients.FindAsync(clientId);
            details = new RestaurantBusinessDetails
            {
                ClientId = clientId,
                Name = client?.Name ?? string.Empty,
                Theme = theme,
                ThemeUpdated = true
            };
            _context.RestaurantBusinessDetails.Add(details);
        }
        else
        {
            details.Theme = theme;
            details.ThemeUpdated = true;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<CategoryDto>> GetCategoriesAsync(Guid clientId)
    {
        var categories = await _context.Categories
            .Where(c => c.ClientId == clientId)
            .OrderBy(c => c.CreatedAtUtc)
            .ToListAsync();

        return categories.Select(c => new CategoryDto
        {
            Id = c.Id.ToString(),
            Name = c.Name,
            ClientId = c.ClientId.ToString(),
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<CategoryDto> AddCategoryAsync(Guid clientId, string name)
    {
        var category = new Category
        {
            ClientId = clientId,
            Name = name,
            IsActive = true
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return new CategoryDto
        {
            Id = category.Id.ToString(),
            Name = category.Name,
            ClientId = category.ClientId.ToString(),
            IsActive = category.IsActive
        };
    }

    public async Task<bool> DeleteCategoryAsync(Guid clientId, Guid categoryId)
    {
        var category = await _context.Categories
            .Include(c => c.Dishes)
            .FirstOrDefaultAsync(c => c.Id == categoryId && c.ClientId == clientId);

        if (category == null) return false;

        _context.Dishes.RemoveRange(category.Dishes);
        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<(bool IsActive, int AffectedDishesCount)> ToggleCategoryStatusAsync(Guid clientId, Guid categoryId)
    {
        var category = await _context.Categories
            .Include(c => c.Dishes)
            .FirstOrDefaultAsync(c => c.Id == categoryId && c.ClientId == clientId);

        if (category == null) throw new KeyNotFoundException("Category not found.");

        category.IsActive = !category.IsActive;
        int affectedCount = 0;

        // If category is being deactivated, automatically deactivate all its dishes in the menu
        if (!category.IsActive)
        {
            var activeDishes = category.Dishes.Where(d => d.IsActive).ToList();
            affectedCount = activeDishes.Count;
            foreach (var dish in activeDishes)
            {
                dish.IsActive = false;
            }
        }

        await _context.SaveChangesAsync();
        return (category.IsActive, affectedCount);
    }

    public async Task<List<DishTypeDto>> GetDishTypesAsync(Guid clientId)
    {
        var types = await _context.DishTypes
            .Where(t => t.ClientId == clientId)
            .OrderBy(t => t.CreatedAtUtc)
            .ToListAsync();

        return types.Select(t => new DishTypeDto
        {
            Id = t.Id.ToString(),
            Name = t.Name,
            ClientId = t.ClientId.ToString(),
            IsActive = t.IsActive
        }).ToList();
    }

    public async Task<DishTypeDto> AddDishTypeAsync(Guid clientId, string name)
    {
        var dishType = new DishType
        {
            ClientId = clientId,
            Name = name,
            IsActive = true
        };

        _context.DishTypes.Add(dishType);
        await _context.SaveChangesAsync();

        return new DishTypeDto
        {
            Id = dishType.Id.ToString(),
            Name = dishType.Name,
            ClientId = dishType.ClientId.ToString(),
            IsActive = dishType.IsActive
        };
    }

    public async Task<bool> DeleteDishTypeAsync(Guid clientId, Guid dishTypeId)
    {
        var dishType = await _context.DishTypes
            .FirstOrDefaultAsync(t => t.Id == dishTypeId && t.ClientId == clientId);

        if (dishType == null) return false;

        _context.DishTypes.Remove(dishType);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<(bool IsActive, int AffectedDishesCount)> ToggleDishTypeStatusAsync(Guid clientId, Guid dishTypeId)
    {
        var dishType = await _context.DishTypes
            .FirstOrDefaultAsync(t => t.Id == dishTypeId && t.ClientId == clientId);

        if (dishType == null) throw new KeyNotFoundException("Dish type not found.");

        dishType.IsActive = !dishType.IsActive;
        int affectedCount = 0;

        // If dish type is being deactivated, automatically deactivate all dishes of this type
        if (!dishType.IsActive)
        {
            var activeDishes = await _context.Dishes
                .Where(d => d.ClientId == clientId && d.Type == dishType.Name && d.IsActive)
                .ToListAsync();

            affectedCount = activeDishes.Count;
            foreach (var dish in activeDishes)
            {
                dish.IsActive = false;
            }
        }

        await _context.SaveChangesAsync();
        return (dishType.IsActive, affectedCount);
    }

    public async Task<List<DishDto>> GetDishesAsync(Guid clientId)
    {
        var dishes = await _context.Dishes
            .Where(d => d.ClientId == clientId)
            .OrderBy(d => d.CreatedAtUtc)
            .ToListAsync();

        return dishes.Select(d => new DishDto
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
        }).ToList();
    }

    public async Task<DishDto> AddDishAsync(Guid clientId, CreateDishDto dto)
    {
        if (!Guid.TryParse(dto.CategoryId, out var categoryId))
        {
            throw new ArgumentException("Invalid category ID.");
        }

        // Verify category belongs to this client
        var categoryExists = await _context.Categories
            .AnyAsync(c => c.Id == categoryId && c.ClientId == clientId);

        if (!categoryExists)
        {
            throw new UnauthorizedAccessException("Category does not belong to this client.");
        }

        var dish = new Dish
        {
            ClientId = clientId,
            CategoryId = categoryId,
            Name = dto.Name,
            Price = dto.Price,
            Quantity = dto.Quantity,
            Type = dto.Type,
            Description = dto.Description,
            ImageUrl = dto.Image,
            IsActive = dto.IsActive ?? true
        };

        _context.Dishes.Add(dish);
        await _context.SaveChangesAsync();

        return new DishDto
        {
            Id = dish.Id.ToString(),
            Name = dish.Name,
            Price = dish.Price,
            Quantity = dish.Quantity,
            Type = dish.Type,
            Description = dish.Description,
            CategoryId = dish.CategoryId.ToString(),
            Image = dish.ImageUrl,
            IsActive = dish.IsActive
        };
    }

    public async Task<DishDto> UpdateDishAsync(Guid clientId, Guid dishId, UpdateDishDto dto)
    {
        var dish = await _context.Dishes
            .FirstOrDefaultAsync(d => d.Id == dishId && d.ClientId == clientId);

        if (dish == null)
        {
            throw new KeyNotFoundException("Dish not found or unauthorized.");
        }

        if (dto.Name != null) dish.Name = dto.Name;
        if (dto.Price.HasValue) dish.Price = dto.Price.Value;
        if (dto.Quantity != null) dish.Quantity = dto.Quantity;
        if (dto.Type != null) dish.Type = dto.Type;
        if (dto.Description != null) dish.Description = dto.Description;
        if (dto.Image != null) dish.ImageUrl = dto.Image;
        if (dto.IsActive.HasValue) dish.IsActive = dto.IsActive.Value;

        if (dto.CategoryId != null && Guid.TryParse(dto.CategoryId, out var catId))
        {
            var categoryExists = await _context.Categories
                .AnyAsync(c => c.Id == catId && c.ClientId == clientId);
            if (!categoryExists)
            {
                throw new ArgumentException("Selected category does not exist or does not belong to this client.");
            }
            dish.CategoryId = catId;
        }

        await _context.SaveChangesAsync();

        return new DishDto
        {
            Id = dish.Id.ToString(),
            Name = dish.Name,
            Price = dish.Price,
            Quantity = dish.Quantity,
            Type = dish.Type,
            Description = dish.Description,
            CategoryId = dish.CategoryId.ToString(),
            Image = dish.ImageUrl,
            IsActive = dish.IsActive
        };
    }

    public async Task<bool> DeleteDishAsync(Guid clientId, Guid dishId)
    {
        var dish = await _context.Dishes
            .FirstOrDefaultAsync(d => d.Id == dishId && d.ClientId == clientId);

        if (dish == null) return false;

        _context.Dishes.Remove(dish);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleDishStatusAsync(Guid clientId, Guid dishId)
    {
        var dish = await _context.Dishes
            .FirstOrDefaultAsync(d => d.Id == dishId && d.ClientId == clientId);

        if (dish == null) return false;

        dish.IsActive = !dish.IsActive;
        await _context.SaveChangesAsync();
        return dish.IsActive;
    }
}
