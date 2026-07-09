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
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ProgressImage> ProgressImages => Set<ProgressImage>();
    public DbSet<ProgressImageSquare> ProgressImageSquares => Set<ProgressImageSquare>();
    public DbSet<SiteSettings> SiteSettings => Set<SiteSettings>();
    public DbSet<PasswordResetOtp> PasswordResetOtps => Set<PasswordResetOtp>();
    public DbSet<ProfileChangeLog> ProfileChangeLogs => Set<ProfileChangeLog>();
    public DbSet<PendingBlockNotification> PendingBlockNotifications => Set<PendingBlockNotification>();
    public DbSet<PendingEmail> PendingEmails => Set<PendingEmail>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<SiteSettings>().HasData(new SiteSettings
        {
            Id = 1,
            ShowStatsSection = true,
            ShowTotalRaised = true
        });

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

        builder.Entity<ProgressImageSquare>()
            .HasKey(pis => new { pis.ProgressImageId, pis.SquareId });

        builder.Entity<ProgressImageSquare>()
            .HasOne(pis => pis.ProgressImage)
            .WithMany(pi => pi.ProgressImageSquares)
            .HasForeignKey(pis => pis.ProgressImageId);

        builder.Entity<ProgressImageSquare>()
            .HasOne(pis => pis.Square)
            .WithMany()
            .HasForeignKey(pis => pis.SquareId);

        builder.Entity<ProgressImage>()
            .HasOne(pi => pi.UploadedBy)
            .WithMany()
            .HasForeignKey(pi => pi.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Square>()
            .HasOne(s => s.Owner)
            .WithMany(u => u.Squares)
            .HasForeignKey(s => s.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Purchase>()
            .HasOne(p => p.User)
            .WithMany(u => u.Purchases)
            .HasForeignKey(p => p.UserId);

        builder.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithMany()
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Square>()
            .Property(s => s.RowVersion)
            .IsRowVersion();

        builder.Entity<PasswordResetOtp>()
            .HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ProfileChangeLog>()
            .HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ProfileChangeLog>()
            .HasIndex(l => new { l.UserId, l.CreatedAt });

        builder.Entity<PendingBlockNotification>()
            .HasKey(p => p.UserId);

        builder.Entity<PendingBlockNotification>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PendingEmail>()
            .HasIndex(e => e.Sent);

        builder.Entity<User>()
            .Property(u => u.ReceiveBlockProgressEmails)
            .HasDefaultValue(true);

        builder.Entity<User>()
            .Property(u => u.PhoneCountryCode)
            .HasDefaultValue("+27");
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
