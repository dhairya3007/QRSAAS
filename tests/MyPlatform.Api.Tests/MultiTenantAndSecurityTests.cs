using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MyPlatform.Application.DTOs.PersonalQr;
using MyPlatform.Application.DTOs.RestaurantMenu;
using MyPlatform.Domain.Entities;
using MyPlatform.Domain.Enums;
using MyPlatform.Infrastructure.Identity;
using MyPlatform.Infrastructure.Persistence;
using MyPlatform.Infrastructure.Services;
using Xunit;

namespace MyPlatform.Api.Tests;

public class MultiTenantAndSecurityTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task Test_MultiTenant_ClientCannotAccessOtherClientDishes()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var clientA = new Client { Id = Guid.NewGuid(), Name = "Pizza House", QrToken = "token-a" };
        var clientB = new Client { Id = Guid.NewGuid(), Name = "Burger King", QrToken = "token-b" };

        var catA = new Category { Id = Guid.NewGuid(), Name = "Pizzas", ClientId = clientA.Id };
        var catB = new Category { Id = Guid.NewGuid(), Name = "Burgers", ClientId = clientB.Id };

        context.Clients.AddRange(clientA, clientB);
        context.Categories.AddRange(catA, catB);
        await context.SaveChangesAsync();

        var menuService = new RestaurantMenuService(context);

        // Client A adds a dish
        await menuService.AddDishAsync(clientA.Id, new CreateDishDto
        {
            Name = "Margherita",
            Price = 12.99m,
            CategoryId = catA.Id.ToString(),
            Type = "Veg",
            Quantity = "12 inch"
        });

        // Act - Client B fetches their dishes
        var clientBDishes = await menuService.GetDishesAsync(clientB.Id);

        // Assert - Client B must NOT see Client A's dish
        Assert.Empty(clientBDishes);

        // Client A fetches their dishes
        var clientADishes = await menuService.GetDishesAsync(clientA.Id);
        Assert.Single(clientADishes);
        Assert.Equal("Margherita", clientADishes[0].Name);
    }

    [Fact]
    public async Task Test_DishAddition_FailsIfCategoryBelongsToAnotherClient()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var clientA = new Client { Id = Guid.NewGuid(), Name = "Pizza House", QrToken = "token-a" };
        var clientB = new Client { Id = Guid.NewGuid(), Name = "Burger King", QrToken = "token-b" };

        var catA = new Category { Id = Guid.NewGuid(), Name = "Pizzas", ClientId = clientA.Id };

        context.Clients.AddRange(clientA, clientB);
        context.Categories.Add(catA);
        await context.SaveChangesAsync();

        var menuService = new RestaurantMenuService(context);

        // Act & Assert - Client B tries to create dish under Client A's category
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            menuService.AddDishAsync(clientB.Id, new CreateDishDto
            {
                Name = "Cheeseburger",
                Price = 9.99m,
                CategoryId = catA.Id.ToString()
            }));
    }

    [Fact]
    public async Task Test_PublicQr_TokenIdentification()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var client = new Client { Id = Guid.NewGuid(), Name = "Test Restaurant", QrToken = "resto-token-123" };
        var profile = new PersonalQrProfile { Id = Guid.NewGuid(), ClientId = client.Id, QrToken = "card-token-456" };

        context.Clients.Add(client);
        context.PersonalQrProfiles.Add(profile);
        await context.SaveChangesAsync();

        var publicService = new PublicQrService(context);

        // Act & Assert
        var restoType = await publicService.IdentifyTokenAsync("resto-token-123");
        Assert.Equal(ServiceType.RestaurantMenu, restoType.Type);

        var cardType = await publicService.IdentifyTokenAsync("card-token-456");
        Assert.Equal(ServiceType.PersonalQr, cardType.Type);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => publicService.IdentifyTokenAsync("non-existent-token"));
    }

    [Fact]
    public async Task Test_PublicMenu_FiltersOutInactiveDishes()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var client = new Client { Id = Guid.NewGuid(), Name = "Cafe", QrToken = "cafe-qr", IsActive = true };
        client.Subscriptions.Add(new ClientServiceSubscription
        {
            ServiceKey = ServiceType.RestaurantMenu,
            IsSuspended = false
        });

        var category = new Category { Id = Guid.NewGuid(), Name = "Drinks", ClientId = client.Id };

        var activeDish = new Dish
        {
            Id = Guid.NewGuid(),
            ClientId = client.Id,
            CategoryId = category.Id,
            Name = "Coffee",
            Price = 4.5m,
            IsActive = true
        };

        var inactiveDish = new Dish
        {
            Id = Guid.NewGuid(),
            ClientId = client.Id,
            CategoryId = category.Id,
            Name = "Seasonal Smoothie",
            Price = 6.0m,
            IsActive = false
        };

        context.Clients.Add(client);
        context.Categories.Add(category);
        context.Dishes.AddRange(activeDish, inactiveDish);
        await context.SaveChangesAsync();

        var publicService = new PublicQrService(context);

        // Act
        var publicMenu = await publicService.GetPublicMenuByTokenAsync("cafe-qr");

        // Assert - Only active dish is returned for public view
        Assert.Single(publicMenu.Dishes);
        Assert.Equal("Coffee", publicMenu.Dishes[0].Name);
    }

    [Fact]
    public async Task Test_PublicPersonalCard_FiltersOutInactiveLinks()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var client = new Client { Id = Guid.NewGuid(), Name = "John Enterprise", IsActive = true };
        client.Subscriptions.Add(new ClientServiceSubscription
        {
            ServiceKey = ServiceType.PersonalQr,
            IsSuspended = false
        });

        var profile = new PersonalQrProfile
        {
            Id = Guid.NewGuid(),
            ClientId = client.Id,
            QrToken = "card-john",
            FirstName = "John",
            Theme = "minimal"
        };

        profile.Links.Add(new CallToActionLink
        {
            ProfileId = profile.Id,
            Title = "LinkedIn",
            Url = "https://linkedin.com",
            IsActive = true
        });

        profile.Links.Add(new CallToActionLink
        {
            ProfileId = profile.Id,
            Title = "Old Twitter",
            Url = "https://twitter.com",
            IsActive = false
        });

        context.Clients.Add(client);
        context.PersonalQrProfiles.Add(profile);
        await context.SaveChangesAsync();

        var publicService = new PublicQrService(context);

        // Act
        var card = await publicService.GetPublicPersonalCardByTokenAsync("card-john");

        // Assert
        Assert.Single(card.Profile.Links);
        Assert.Equal("LinkedIn", card.Profile.Links[0].Title);
    }

    [Fact]
    public async Task Test_PublicInquirySubmission_CreatesInquiryForClient()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var client = new Client { Id = Guid.NewGuid(), Name = "Jane Doe", IsActive = true };
        var profile = new PersonalQrProfile { Id = Guid.NewGuid(), ClientId = client.Id, QrToken = "card-jane" };

        context.Clients.Add(client);
        context.PersonalQrProfiles.Add(profile);
        await context.SaveChangesAsync();

        var publicService = new PublicQrService(context);
        var personalQrService = new PersonalQrService(context);

        // Act
        var result = await publicService.SubmitInquiryAsync("card-jane", new CreateInquiryDto
        {
            Name = "Alice Visitor",
            Email = "alice@example.com",
            Phone = "1234567890",
            Message = "Interested in connecting!"
        });

        // Assert
        Assert.True(result);
        var inquiries = await personalQrService.GetInquiriesAsync(client.Id);
        Assert.Single(inquiries);
        Assert.Equal("Alice Visitor", inquiries[0].Name);
        Assert.Equal("Interested in connecting!", inquiries[0].Message);
    }

    [Fact]
    public void Test_JwtTokenGeneration_IncludesTenantAndRoleClaims()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Jwt:Key", "TestSecretKeyMustBeLongEnoughForHmacSha256Algorithm!"},
            {"Jwt:Issuer", "TestIssuer"},
            {"Jwt:Audience", "TestAudience"},
            {"Jwt:ExpiryInMinutes", "60"}
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var jwtService = new JwtTokenService(configuration);

        var user = new ApplicationUser
        {
            Id = "user-guid-001",
            Email = "owner@pizza.com",
            FullName = "Pizza Owner"
        };

        var client = new Client
        {
            Id = Guid.NewGuid(),
            Name = "The Pizza House",
            QrToken = "pizza-qr-tok"
        };

        var services = new List<string> { "restaurant_menu", "personal_qr" };

        // Act
        var tokenString = jwtService.GenerateToken(user, UserRole.Client, client, services);

        // Assert
        Assert.False(string.IsNullOrWhiteSpace(tokenString));

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(tokenString);

        Assert.Equal(UserRole.Client, jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value);
        Assert.Equal(client.Id.ToString(), jwt.Claims.First(c => c.Type == "client_id").Value);
        Assert.Equal("pizza-qr-tok", jwt.Claims.First(c => c.Type == "qr_token").Value);
        Assert.Contains("restaurant_menu", jwt.Claims.First(c => c.Type == "services").Value);
    }

    [Fact]
    public void Test_ThemesController_ReturnsDynamicCatalog()
    {
        // Arrange
        var controller = new MyPlatform.Api.Controllers.ThemesController();

        // Act - Fetch All Themes
        var allResult = controller.GetThemes() as Microsoft.AspNetCore.Mvc.OkObjectResult;
        Assert.NotNull(allResult);
        var allThemes = allResult.Value as List<MyPlatform.Domain.Common.ThemeDefinition>;
        Assert.NotNull(allThemes);
        Assert.True(allThemes.Count >= 22);

        // Act - Fetch Restaurant Menu Themes
        var restoResult = controller.GetThemes("restaurant_menu") as Microsoft.AspNetCore.Mvc.OkObjectResult;
        Assert.NotNull(restoResult);
        var restoThemes = restoResult.Value as List<MyPlatform.Domain.Common.ThemeDefinition>;
        Assert.NotNull(restoThemes);
        Assert.All(restoThemes, t => Assert.Equal("restaurant_menu", t.ServiceType));
        Assert.Contains(restoThemes, t => t.Id == "luxury");

        // Act - Fetch Personal QR Themes
        var personalResult = controller.GetThemes("personal_qr") as Microsoft.AspNetCore.Mvc.OkObjectResult;
        Assert.NotNull(personalResult);
        var personalThemes = personalResult.Value as List<MyPlatform.Domain.Common.ThemeDefinition>;
        Assert.NotNull(personalThemes);
        Assert.All(personalThemes, t => Assert.Equal("personal_qr", t.ServiceType));
        Assert.Contains(personalThemes, t => t.Id == "neon");

        // Act - Fetch by ID
        var luxuryResult = controller.GetThemeById("luxury") as Microsoft.AspNetCore.Mvc.OkObjectResult;
        Assert.NotNull(luxuryResult);
        var luxuryTheme = luxuryResult.Value as MyPlatform.Domain.Common.ThemeDefinition;
        Assert.NotNull(luxuryTheme);
        Assert.Equal("luxury", luxuryTheme.Id);
        Assert.Equal("Luxury Navy & Gold", luxuryTheme.Name);

        // Act - Fetch Nonexistent Theme
        var missingResult = controller.GetThemeById("nonexistent_theme_xyz") as Microsoft.AspNetCore.Mvc.NotFoundObjectResult;
        Assert.NotNull(missingResult);
    }
}
