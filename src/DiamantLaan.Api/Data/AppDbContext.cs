using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Data;

public class AppDbContext : IdentityDbContext<User>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Square> Squares => Set<Square>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseSquare> PurchaseSquares => Set<PurchaseSquare>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<PurchaseSquare>()
            .HasKey(ps => new { ps.PurchaseId, ps.SquareId });

        builder.Entity<PurchaseSquare>()
            .HasOne(ps => ps.Purchase)
            .WithMany(p => p.PurchaseSquares)
            .HasForeignKey(ps => ps.PurchaseId);

        builder.Entity<PurchaseSquare>()
            .HasOne(ps => ps.Square)
            .WithMany(s => s.PurchaseSquares)
            .HasForeignKey(ps => ps.SquareId);

        builder.Entity<Square>()
            .HasOne(s => s.Owner)
            .WithMany(u => u.Squares)
            .HasForeignKey(s => s.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Purchase>()
            .HasOne(p => p.User)
            .WithMany(u => u.Purchases)
            .HasForeignKey(p => p.UserId);
    }

    public static async Task SeedAsync(UserManager<User> userManager, RoleManager<IdentityRole> roleManager, AppDbContext db, string adminEmail, string adminPassword)
    {
        if (!await roleManager.RoleExistsAsync("Admin"))
            await roleManager.CreateAsync(new IdentityRole("Admin"));
        if (!await roleManager.RoleExistsAsync("Buyer"))
            await roleManager.CreateAsync(new IdentityRole("Buyer"));

        if (await userManager.FindByEmailAsync(adminEmail) == null)
        {
            var admin = new User
            {
                UserName = adminEmail,
                Email = adminEmail,
                FirstName = "Admin",
                LastName = "Diamant",
                EmailConfirmed = true
            };
            await userManager.CreateAsync(admin, adminPassword);
            await userManager.AddToRoleAsync(admin, "Admin");
        }

        if (!db.Squares.Any())
        {
            var squares = new List<Square>();
            for (int i = 1; i <= 4500; i++)
            {
                squares.Add(new Square { Id = i, Status = SquareStatus.NogNieBeginNie });
            }
            db.Squares.AddRange(squares);
            await db.SaveChangesAsync();
        }
    }
}
