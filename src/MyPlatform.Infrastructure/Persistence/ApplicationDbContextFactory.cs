using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace MyPlatform.Infrastructure.Persistence;

public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        
        // Default design-time SQL Server connection string
        var connectionString = "Server=(localdb)\\MSSQLLocalDB;Database=MyPlatformDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";
        
        optionsBuilder.UseSqlServer(connectionString, b => b.MigrationsAssembly("MyPlatform.Infrastructure"));

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
