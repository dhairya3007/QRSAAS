using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MyPlatform.Domain.Entities;
using MyPlatform.Domain.Enums;

namespace MyPlatform.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        // ----------------------------------------------------
        // 1. Seed Roles
        // ----------------------------------------------------
        if (!await roleManager.RoleExistsAsync(UserRole.Admin))
        {
            await roleManager.CreateAsync(new IdentityRole(UserRole.Admin));
        }

        if (!await roleManager.RoleExistsAsync(UserRole.Client))
        {
            await roleManager.CreateAsync(new IdentityRole(UserRole.Client));
        }

        // ----------------------------------------------------
        // 2. Seed Super Admin User
        // ----------------------------------------------------
        var adminEmail = "admin@test.com";
        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FullName = "Super Admin",
                UserType = UserRole.Admin,
                IsActive = true,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(adminUser, "password123");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, UserRole.Admin);
            }
        }

        // ----------------------------------------------------
        // 3. Seed Demo Clients if table is empty
        // ----------------------------------------------------
        if (!await context.Clients.AnyAsync())
        {
            // ================================================
            // 🍕 CLIENT 1: The Pizza House (Restaurant Menu)
            // ================================================
            var pizzaClient = new Client
            {
                Name = "The Pizza House",
                Email = "admin@pizzahouse.com",
                QrToken = "demo-pizza-token",
                IsActive = true,
                ScanCount = 284,
                BusinessDetails = new RestaurantBusinessDetails
                {
                    Name = "The Pizza House",
                    Phone = "+1 234 567 8900",
                    Address = "123 Pizza Street, Food City",
                    LogoUrl = "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=80",
                    Theme = "modern",
                    ThemeUpdated = true
                }
            };

            pizzaClient.Subscriptions.Add(new ClientServiceSubscription
            {
                ServiceKey = ServiceType.RestaurantMenu,
                DurationMonths = 12,
                ExpireAtUtc = DateTime.UtcNow.AddMonths(12),
                IsSetupCompleted = true
            });

            // Categories
            var pizzaCat1 = new Category { Name = "Wood Fired Pizzas", Client = pizzaClient };
            var pizzaCat2 = new Category { Name = "Pastas & Starters", Client = pizzaClient };
            var pizzaCat3 = new Category { Name = "Beverages & Desserts", Client = pizzaClient };

            // Dishes for Category 1
            pizzaCat1.Dishes.Add(new Dish
            {
                Client = pizzaClient,
                Name = "Classic Margherita",
                Price = 299,
                Quantity = "10 inch",
                Type = "Veg",
                ImageUrl = "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            pizzaCat1.Dishes.Add(new Dish
            {
                Client = pizzaClient,
                Name = "Pepperoni Feast",
                Price = 449,
                Quantity = "12 inch",
                Type = "Non-Veg",
                ImageUrl = "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            pizzaCat1.Dishes.Add(new Dish
            {
                Client = pizzaClient,
                Name = "Truffle Wild Mushroom",
                Price = 499,
                Quantity = "12 inch",
                Type = "Veg",
                ImageUrl = "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            // Dishes for Category 2
            pizzaCat2.Dishes.Add(new Dish
            {
                Client = pizzaClient,
                Name = "Garlic Parmesan Breadsticks",
                Price = 149,
                Quantity = "4 pieces",
                Type = "Veg",
                ImageUrl = "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            pizzaCat2.Dishes.Add(new Dish
            {
                Client = pizzaClient,
                Name = "Creamy Fettuccine Alfredo",
                Price = 349,
                Quantity = "1 bowl",
                Type = "Veg",
                ImageUrl = "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            // Dishes for Category 3
            pizzaCat3.Dishes.Add(new Dish
            {
                Client = pizzaClient,
                Name = "Belgian Chocolate Lava Cake",
                Price = 199,
                Quantity = "1 portion",
                Type = "Veg",
                ImageUrl = "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            pizzaCat3.Dishes.Add(new Dish
            {
                Client = pizzaClient,
                Name = "Fresh Berry Lemonade",
                Price = 129,
                Quantity = "400ml",
                Type = "Veg",
                ImageUrl = "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            pizzaClient.Categories.Add(pizzaCat1);
            pizzaClient.Categories.Add(pizzaCat2);
            pizzaClient.Categories.Add(pizzaCat3);

            pizzaClient.DishTypes.Add(new DishType { Name = "Veg", Client = pizzaClient });
            pizzaClient.DishTypes.Add(new DishType { Name = "Non-Veg", Client = pizzaClient });

            context.Clients.Add(pizzaClient);
            await context.SaveChangesAsync();

            var pizzaUser = new ApplicationUser
            {
                UserName = pizzaClient.Email,
                Email = pizzaClient.Email,
                FullName = pizzaClient.Name,
                UserType = UserRole.Client,
                ClientId = pizzaClient.Id,
                IsActive = true,
                EmailConfirmed = true
            };
            var pUserResult = await userManager.CreateAsync(pizzaUser, "password123");
            if (pUserResult.Succeeded)
            {
                await userManager.AddToRoleAsync(pizzaUser, UserRole.Client);
            }

            // ================================================
            // 💼 CLIENT 2: John Doe Enterprise (Personal QR)
            // ================================================
            var johnClient = new Client
            {
                Name = "John Doe Enterprise",
                Email = "john@enterprise.com",
                QrToken = "demo-john-token",
                PersonalQrToken = "card-johndoe",
                IsActive = true,
                ScanCount = 142,
                PersonalProfile = new PersonalQrProfile
                {
                    QrToken = "card-johndoe",
                    FirstName = "John",
                    LastName = "Doe",
                    Designation = "CEO & Enterprise Consultant",
                    Bio = "Hi, I am John Doe. Helping businesses scale with digital infrastructure. Let's connect!",
                    ProfilePicUrl = "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&auto=format&fit=crop&q=60",
                    Theme = "corporate"
                }
            };

            johnClient.Subscriptions.Add(new ClientServiceSubscription
            {
                ServiceKey = ServiceType.PersonalQr,
                DurationMonths = 24,
                ExpireAtUtc = DateTime.UtcNow.AddMonths(24),
                IsSetupCompleted = true
            });

            johnClient.PersonalProfile.Links.Add(new CallToActionLink
            {
                Title = "LinkedIn Profile",
                Url = "https://linkedin.com",
                Icon = "linkedin",
                Clicks = 54,
                DisplayOrder = 1,
                IsActive = true
            });

            johnClient.PersonalProfile.Links.Add(new CallToActionLink
            {
                Title = "Company Website",
                Url = "https://example.com",
                Icon = "globe",
                Clicks = 32,
                DisplayOrder = 2,
                IsActive = true
            });

            johnClient.PersonalProfile.Links.Add(new CallToActionLink
            {
                Title = "Book 1:1 Consultation",
                Url = "https://calendly.com",
                Icon = "calendar",
                Clicks = 18,
                DisplayOrder = 3,
                IsActive = true
            });

            // Sample Lead Inquiries
            johnClient.Inquiries.Add(new Inquiry
            {
                ClientId = johnClient.Id,
                Name = "Michael Scott",
                Email = "michael@dundermifflin.com",
                Phone = "+1 555 444 3333",
                Message = "Interested in enterprise consulting for our sales branch operations."
            });

            johnClient.Inquiries.Add(new Inquiry
            {
                ClientId = johnClient.Id,
                Name = "Sarah Connor",
                Email = "sarah@cyberdyne.org",
                Phone = "+1 555 222 1111",
                Message = "Loved your digital card! Would love to explore a joint venture."
            });

            context.Clients.Add(johnClient);
            await context.SaveChangesAsync();

            var johnUser = new ApplicationUser
            {
                UserName = johnClient.Email,
                Email = johnClient.Email,
                FullName = johnClient.Name,
                UserType = UserRole.Client,
                ClientId = johnClient.Id,
                IsActive = true,
                EmailConfirmed = true
            };
            var jUserResult = await userManager.CreateAsync(johnUser, "password123");
            if (jUserResult.Succeeded)
            {
                await userManager.AddToRoleAsync(johnUser, UserRole.Client);
            }

            // ================================================
            // 👑 CLIENT 3: Elite Cafe & Chef Jane (Dual Services)
            // ================================================
            var janeClient = new Client
            {
                Name = "Elite Cafe & Chef Jane",
                Email = "jane@elitecafe.com",
                QrToken = "demo-elite-token",
                PersonalQrToken = "card-jane",
                IsActive = true,
                ScanCount = 310,
                BusinessDetails = new RestaurantBusinessDetails
                {
                    Name = "Elite Cafe",
                    Phone = "+1 555 123 4567",
                    Address = "789 Luxury Ave, Gourmet District",
                    LogoUrl = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop&q=80",
                    Theme = "luxury",
                    ThemeUpdated = true
                },
                PersonalProfile = new PersonalQrProfile
                {
                    QrToken = "card-jane",
                    FirstName = "Chef",
                    LastName = "Jane",
                    Designation = "Founder & Executive Chef",
                    Bio = "Culinary artist, founder of Elite Cafe, and author of Modern Gastronomy.",
                    ProfilePicUrl = "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500&auto=format&fit=crop&q=60",
                    Theme = "luxury"
                }
            };

            janeClient.Subscriptions.Add(new ClientServiceSubscription
            {
                ServiceKey = ServiceType.RestaurantMenu,
                DurationMonths = 6,
                ExpireAtUtc = DateTime.UtcNow.AddMonths(6),
                IsSetupCompleted = true
            });

            janeClient.Subscriptions.Add(new ClientServiceSubscription
            {
                ServiceKey = ServiceType.PersonalQr,
                DurationMonths = 6,
                ExpireAtUtc = DateTime.UtcNow.AddMonths(6),
                IsSetupCompleted = true
            });

            var janeCat1 = new Category { Name = "Signature Coffees", Client = janeClient };
            var janeCat2 = new Category { Name = "Artisan Pastries", Client = janeClient };

            janeCat1.Dishes.Add(new Dish
            {
                Client = janeClient,
                Name = "Caramel Macchiato",
                Price = 199,
                Quantity = "350ml",
                Type = "Veg",
                ImageUrl = "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            janeCat1.Dishes.Add(new Dish
            {
                Client = janeClient,
                Name = "Vanilla Cold Brew",
                Price = 229,
                Quantity = "400ml",
                Type = "Veg",
                ImageUrl = "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            janeCat2.Dishes.Add(new Dish
            {
                Client = janeClient,
                Name = "French Butter Croissant",
                Price = 129,
                Quantity = "1 piece",
                Type = "Veg",
                ImageUrl = "https://images.unsplash.com/photo-1555507036-ab1e4006aaeb?w=500&auto=format&fit=crop&q=60",
                IsActive = true
            });

            janeClient.Categories.Add(janeCat1);
            janeClient.Categories.Add(janeCat2);
            janeClient.DishTypes.Add(new DishType { Name = "Veg", Client = janeClient });

            janeClient.PersonalProfile.Links.Add(new CallToActionLink
            {
                Title = "Instagram @ChefJane",
                Url = "https://instagram.com",
                Icon = "instagram",
                Clicks = 82,
                DisplayOrder = 1,
                IsActive = true
            });

            janeClient.PersonalProfile.Links.Add(new CallToActionLink
            {
                Title = "Book a Masterclass",
                Url = "https://example.com/class",
                Icon = "calendar",
                Clicks = 46,
                DisplayOrder = 2,
                IsActive = true
            });

            janeClient.Inquiries.Add(new Inquiry
            {
                ClientId = janeClient.Id,
                Name = "Gordon Ramsay",
                Email = "gordon@kitchen.com",
                Phone = "+1 555 777 8888",
                Message = "Inquiring about private catering for an executive dinner for 20 VIP guests."
            });

            context.Clients.Add(janeClient);
            await context.SaveChangesAsync();

            var janeUser = new ApplicationUser
            {
                UserName = janeClient.Email,
                Email = janeClient.Email,
                FullName = janeClient.Name,
                UserType = UserRole.Client,
                ClientId = janeClient.Id,
                IsActive = true,
                EmailConfirmed = true
            };
            var jneUserResult = await userManager.CreateAsync(janeUser, "password123");
            if (jneUserResult.Succeeded)
            {
                await userManager.AddToRoleAsync(janeUser, UserRole.Client);
            }

            // ================================================
            // 🏋️ CLIENT 4: Apex Fitness Studio (Pending Setup)
            // ================================================
            var apexClient = new Client
            {
                Name = "Apex Fitness Studio",
                Email = "admin@apexfitness.com",
                QrToken = "demo-apex-setup-token",
                IsActive = true,
                ScanCount = 0
            };

            apexClient.Subscriptions.Add(new ClientServiceSubscription
            {
                ServiceKey = ServiceType.PersonalQr,
                DurationMonths = 12,
                ExpireAtUtc = DateTime.UtcNow.AddMonths(12),
                IsSetupCompleted = false // Demonstrates onboarding setup link!
            });

            context.Clients.Add(apexClient);
            await context.SaveChangesAsync();
        }
    }
}
