namespace MyPlatform.Application.DTOs.RestaurantMenu;

public class CategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
}

public class CreateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string? ClientId { get; set; }
}

public class DishTypeDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
}

public class CreateDishTypeDto
{
    public string Name { get; set; } = string.Empty;
    public string? ClientId { get; set; }
}

public class DishDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Quantity { get; set; } = string.Empty;
    public string Type { get; set; } = "Veg";
    public string? Description { get; set; }
    public string CategoryId { get; set; } = string.Empty;
    public string? Image { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateDishDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Quantity { get; set; } = string.Empty;
    public string Type { get; set; } = "Veg";
    public string? Description { get; set; }
    public string CategoryId { get; set; } = string.Empty;
    public string? Image { get; set; }
    public bool? IsActive { get; set; } = true;
    public string? ClientId { get; set; }
}

public class UpdateDishDto
{
    public string? Name { get; set; }
    public decimal? Price { get; set; }
    public string? Quantity { get; set; }
    public string? Type { get; set; }
    public string? Description { get; set; }
    public string? CategoryId { get; set; }
    public string? Image { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateThemeDto
{
    public string Theme { get; set; } = "modern";
}

public class SaveBusinessDetailsDto
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Logo { get; set; }
}
