using DiamantLaan.Api.Models;
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
}
