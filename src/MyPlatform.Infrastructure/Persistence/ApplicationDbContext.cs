using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MyPlatform.Domain.Entities;

namespace MyPlatform.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole, string>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Client> Clients => Set<Client>();
    public DbSet<ClientServiceSubscription> ClientServiceSubscriptions => Set<ClientServiceSubscription>();
    public DbSet<RestaurantBusinessDetails> RestaurantBusinessDetails => Set<RestaurantBusinessDetails>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<DishType> DishTypes => Set<DishType>();
    public DbSet<Dish> Dishes => Set<Dish>();
    public DbSet<PersonalQrProfile> PersonalQrProfiles => Set<PersonalQrProfile>();
    public DbSet<CallToActionLink> CallToActionLinks => Set<CallToActionLink>();
    public DbSet<Inquiry> Inquiries => Set<Inquiry>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Client Indexes
        builder.Entity<Client>()
            .HasIndex(c => c.QrToken)
            .IsUnique();

        builder.Entity<Client>()
            .HasIndex(c => c.PersonalQrToken)
            .IsUnique()
            .HasFilter("[PersonalQrToken] IS NOT NULL");

        builder.Entity<PersonalQrProfile>()
            .HasIndex(p => p.QrToken)
            .IsUnique();

        // Decimal Precision for Money
        builder.Entity<Dish>()
            .Property(d => d.Price)
            .HasPrecision(18, 2);

        // ApplicationUser <-> Client (1 to 1 optional)
        builder.Entity<ApplicationUser>()
            .HasOne(u => u.Client)
            .WithOne(c => c.User)
            .HasForeignKey<ApplicationUser>(u => u.ClientId)
            .OnDelete(DeleteBehavior.SetNull);

        // Client <-> RestaurantBusinessDetails (1 to 1)
        builder.Entity<RestaurantBusinessDetails>()
            .HasOne(b => b.Client)
            .WithOne(c => c.BusinessDetails)
            .HasForeignKey<RestaurantBusinessDetails>(b => b.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Client <-> PersonalQrProfile (1 to 1)
        builder.Entity<PersonalQrProfile>()
            .HasOne(p => p.Client)
            .WithOne(c => c.PersonalProfile)
            .HasForeignKey<PersonalQrProfile>(p => p.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Client <-> Subscriptions (1 to Many)
        builder.Entity<ClientServiceSubscription>()
            .HasOne(s => s.Client)
            .WithMany(c => c.Subscriptions)
            .HasForeignKey(s => s.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Client <-> Categories (1 to Many)
        builder.Entity<Category>()
            .HasOne(cat => cat.Client)
            .WithMany(c => c.Categories)
            .HasForeignKey(cat => cat.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Client <-> DishTypes (1 to Many)
        builder.Entity<DishType>()
            .HasOne(dt => dt.Client)
            .WithMany(c => c.DishTypes)
            .HasForeignKey(dt => dt.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Category <-> Dishes (1 to Many)
        builder.Entity<Dish>()
            .HasOne(d => d.Category)
            .WithMany(cat => cat.Dishes)
            .HasForeignKey(d => d.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        // Client <-> Dishes (1 to Many, Restrict delete to avoid multiple cascade paths)
        builder.Entity<Dish>()
            .HasOne(d => d.Client)
            .WithMany(c => c.Dishes)
            .HasForeignKey(d => d.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        // PersonalQrProfile <-> CallToActionLinks (1 to Many)
        builder.Entity<CallToActionLink>()
            .HasOne(l => l.Profile)
            .WithMany(p => p.Links)
            .HasForeignKey(l => l.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        // Client <-> Inquiries (1 to Many)
        builder.Entity<Inquiry>()
            .HasOne(i => i.Client)
            .WithMany(c => c.Inquiries)
            .HasForeignKey(i => i.ClientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
