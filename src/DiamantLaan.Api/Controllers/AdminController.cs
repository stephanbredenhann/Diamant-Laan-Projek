using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly IWebHostEnvironment _env;

    public AdminController(AppDbContext db, UserManager<User> userManager, IWebHostEnvironment env)
    {
        _db = db;
        _userManager = userManager;
        _env = env;
    }

    [HttpPut("squares/status")]
    public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkStatusUpdateDto dto)
    {
        var squares = await _db.Squares
            .Where(s => dto.SquareIds.Contains(s.Id))
            .ToListAsync();

        if (squares.Count != dto.SquareIds.Count)
            return BadRequest(new { message = "Sommige blokke bestaan nie." });

        foreach (var square in squares)
        {
            // Cannot downgrade from KlaarGeteer
            if (square.Status == SquareStatus.KlaarGeteer && dto.Status != SquareStatus.KlaarGeteer)
                return BadRequest(new { message = $"Blok #{square.Id} is reeds klaar geteer." });
            // Cannot skip statuses
            if ((int)dto.Status > (int)square.Status + 1)
                return BadRequest(new { message = $"Kan nie blok #{square.Id} van {square.Status} na {dto.Status} skuif nie." });

            square.Status = dto.Status;
        }

        await _db.SaveChangesAsync();
        return Ok(new { updated = squares.Count });
    }

    [HttpGet("purchases")]
    public async Task<IActionResult> GetPurchases()
    {
        var purchases = await _db.Purchases
            .Include(p => p.User)
            .Include(p => p.PurchaseSquares)
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync();

        var buyers = purchases
            .GroupBy(p => p.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Name = g.First().User.FirstName + " " + g.First().User.LastName,
                Email = g.First().User.Email,
                PhoneNumber = g.First().User.PhoneNumber,
                IsOraniaResident = g.First().User.IsOraniaResident,
                Squares = g.Sum(p => p.PurchaseSquares.Count),
                TotalSpent = g.Sum(p => p.Amount)
            })
            .OrderByDescending(b => b.TotalSpent)
            .ToList();

        return Ok(buyers);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _db.Squares.CountAsync();
        var perStatus = await _db.Squares
            .GroupBy(s => s.Status)
            .Select(g => new { Status = (int)g.Key, Count = g.Count() })
            .ToListAsync();

        var klaarCount = perStatus.FirstOrDefault(x => x.Status == (int)SquareStatus.KlaarGeteer)?.Count ?? 0;
        var progress = total > 0 ? Math.Round((double)klaarCount / total * 100, 1) : 0;

        var soldCount = await _db.Squares.CountAsync(s => s.OwnerId != null);
        var totalRaised = await _db.Purchases.SumAsync(p => (double)p.Amount);

        var dailySales = await _db.Purchases
            .GroupBy(p => p.PurchaseDate.Date)
            .Select(g => new { Date = g.Key, Amount = g.Sum(p => (double)p.Amount), Squares = g.Sum(p => p.PurchaseSquares.Count) })
            .OrderBy(g => g.Date)
            .ToListAsync();

        const double sponsorBaseline = 2_000_000;
        var averageSpendPerBlock = soldCount > 0 ? Math.Round(totalRaised / soldCount, 2) : 0;

        var purchases = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .Include(p => p.User)
            .ToListAsync();

        var overMinimumSquares = 0;
        var exactMinimumSquares = 0;
        foreach (var p in purchases)
        {
            var squareCount = p.PurchaseSquares.Count;
            if (squareCount == 0) continue;
            var minAmount = squareCount * 500m;
            if (p.Amount > minAmount)
                overMinimumSquares += squareCount;
            else
                exactMinimumSquares += squareCount;
        }

        var oraniaSpend = purchases.Where(p => p.User.IsOraniaResident).Sum(p => (double)p.Amount);
        var outsiderSpend = purchases.Where(p => !p.User.IsOraniaResident).Sum(p => (double)p.Amount);

        return Ok(new
        {
            totalSquares = total,
            soldSquares = soldCount,
            progress,
            totalRaised,
            sponsorBaseline,
            averageSpendPerBlock,
            perStatus,
            dailySales,
            overMinimumSquares,
            exactMinimumSquares,
            oraniaSpend,
            outsiderSpend
        });
    }

    [HttpGet("registered-no-purchase")]
    public async Task<IActionResult> GetRegisteredNoPurchase()
    {
        var usersWithPurchases = await _db.Purchases
            .Select(p => p.UserId)
            .Distinct()
            .ToListAsync();

        var users = await _db.Users
            .Where(u => !usersWithPurchases.Contains(u.Id))
            .OrderBy(u => u.Email)
            .Select(u => new
            {
                u.Id,
                Name = u.FirstName + " " + u.LastName,
                u.Email,
                u.PhoneNumber,
                u.IsOraniaResident
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost("users/make-admin")]
    public async Task<IActionResult> MakeAdmin([FromBody] MakeAdminDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
            return NotFound(new { message = "Gebruiker nie gevind nie." });

        if (await _userManager.IsInRoleAsync(user, "Admin"))
            return BadRequest(new { message = "Gebruiker is reeds 'n admin." });

        var result = await _userManager.AddToRoleAsync(user, "Admin");
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(new { message = $"{dto.Email} is nou 'n admin." });
    }

    [HttpPost("manual-purchase")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> ManualPurchase([FromForm] ManualPurchaseDto dto, IFormFile? proofOfPayment)
    {
        if (proofOfPayment != null && !proofOfPayment.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Bewys van betaling moet 'n PDF wees." });

        var squares = await _db.Squares
            .Where(s => dto.SquareIds.Contains(s.Id))
            .ToListAsync();

        if (squares.Count != dto.SquareIds.Count)
            return BadRequest(new { message = "Sommige blokke bestaan nie." });

        if (squares.Any(s => s.OwnerId != null))
            return BadRequest(new { message = "Sommige blokke is reeds verkoop." });

        if (squares.Any(s => s.Id < 1 || s.Id > 4200))
            return BadRequest(new { message = "Ongeldige blokke gekies." });

        var minimumAmount = squares.Count * 500m;
        if (dto.AmountPaid < minimumAmount)
            return BadRequest(new { message = $"Minimum bedrag is R{minimumAmount:0}." });

        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            user = new User
            {
                UserName = dto.Email,
                Email = dto.Email,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                PhoneNumber = dto.PhoneNumber,
                IsOraniaResident = dto.IsOraniaResident,
                EmailConfirmed = true
            };
            var tempPassword = Guid.NewGuid().ToString("N") + "Aa1!";
            var createResult = await _userManager.CreateAsync(user, tempPassword);
            if (!createResult.Succeeded)
                return BadRequest(createResult.Errors.Select(e => e.Description));
            await _userManager.AddToRoleAsync(user, "Buyer");
        }
        else
        {
            user.FirstName = dto.FirstName;
            user.LastName = dto.LastName;
            user.PhoneNumber = dto.PhoneNumber;
            user.IsOraniaResident = dto.IsOraniaResident;
            await _userManager.UpdateAsync(user);
        }

        var purchase = new Purchase
        {
            UserId = user.Id,
            Amount = dto.AmountPaid
        };

        foreach (var square in squares)
        {
            square.OwnerId = user.Id;
            purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = square.Id });
        }

        _db.Purchases.Add(purchase);
        await _db.SaveChangesAsync();

        if (proofOfPayment != null)
        {
            var uploadsDir = Path.Combine(_env.WebRootPath, "uploads", "proofs");
            Directory.CreateDirectory(uploadsDir);
            var fileName = $"{purchase.Id}.pdf";
            var filePath = Path.Combine(uploadsDir, fileName);
            await using var stream = new FileStream(filePath, FileMode.Create);
            await proofOfPayment.CopyToAsync(stream);
            purchase.ProofOfPaymentPath = $"/uploads/proofs/{fileName}";
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            purchaseId = purchase.Id,
            amount = purchase.Amount,
            squareCount = squares.Count,
            userId = user.Id,
            proofOfPaymentPath = purchase.ProofOfPaymentPath
        });
    }

    [HttpGet("purchases/{id}/proof")]
    public async Task<IActionResult> GetProofOfPayment(int id)
    {
        var purchase = await _db.Purchases.FindAsync(id);
        if (purchase == null || string.IsNullOrEmpty(purchase.ProofOfPaymentPath))
            return NotFound();

        var filePath = Path.Combine(_env.WebRootPath, purchase.ProofOfPaymentPath.TrimStart('/'));
        if (!System.IO.File.Exists(filePath))
            return NotFound();

        return PhysicalFile(filePath, "application/pdf", $"bewys-{id}.pdf");
    }
}
