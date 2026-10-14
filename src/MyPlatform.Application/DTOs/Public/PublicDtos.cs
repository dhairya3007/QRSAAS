using MyPlatform.Application.DTOs.Clients;
using MyPlatform.Application.DTOs.PersonalQr;
using MyPlatform.Application.DTOs.RestaurantMenu;

namespace MyPlatform.Application.DTOs.Public;

public class PublicMenuResponseDto
{
    public ClientDto Client { get; set; } = null!;
    public List<CategoryDto> Categories { get; set; } = new();
    public List<DishDto> Dishes { get; set; } = new();
}

public class PublicPersonalCardResponseDto
{
    public ClientDto Client { get; set; } = null!;
    public PersonalQrProfileDto Profile { get; set; } = null!;
}

public class TokenIdentifyResponseDto
{
    public string Type { get; set; } = string.Empty; // "restaurant_menu" or "personal_qr"
}
