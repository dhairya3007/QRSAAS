using MyPlatform.Application.DTOs.Clients;
using MyPlatform.Application.DTOs.RestaurantMenu;

namespace MyPlatform.Application.Interfaces;

public interface IRestaurantMenuService
{
    // Business Profile & Theme
    Task<BusinessDetailsDto> GetBusinessDetailsAsync(Guid clientId);
    Task<BusinessDetailsDto> SaveBusinessDetailsAsync(Guid clientId, SaveBusinessDetailsDto dto);
    Task<bool> UpdateThemeAsync(Guid clientId, string theme);

    // Categories
    Task<List<CategoryDto>> GetCategoriesAsync(Guid clientId);
    Task<CategoryDto> AddCategoryAsync(Guid clientId, string name);
    Task<bool> DeleteCategoryAsync(Guid clientId, Guid categoryId);

    // Dynamic Dish Types
    Task<List<DishTypeDto>> GetDishTypesAsync(Guid clientId);
    Task<DishTypeDto> AddDishTypeAsync(Guid clientId, string name);
    Task<bool> DeleteDishTypeAsync(Guid clientId, Guid dishTypeId);

    // Dishes
    Task<List<DishDto>> GetDishesAsync(Guid clientId);
    Task<DishDto> AddDishAsync(Guid clientId, CreateDishDto dto);
    Task<DishDto> UpdateDishAsync(Guid clientId, Guid dishId, UpdateDishDto dto);
    Task<bool> DeleteDishAsync(Guid clientId, Guid dishId);
    Task<bool> ToggleDishStatusAsync(Guid clientId, Guid dishId);
}
