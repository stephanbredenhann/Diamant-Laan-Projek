# Diamant Laan Teerprojek — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a crowd-funding web app where residents buy square meters of Diamant Laan road (R500/m²) and track paving progress on an interactive S-shaped road map.

**Architecture:** .NET 8 Web API backend with EF Core 8 + MSSQL, Angular 19 standalone SPA frontend with SVG road map, JWT auth via ASP.NET Identity. Backend serves frontend in production via `app.UseDefaultFiles` + `app.UseStaticFiles`.

**Tech Stack:** C# .NET 8, Angular 19.2, EF Core 8, MSSQL (LocalDB), ASP.NET Identity, JWT Bearer auth, CSS Variables theming, SVG road map

---

## File Structure

```
DiamantLaan.sln
└── src/
    ├── DiamantLaan.Api/
    │   ├── Program.cs
    │   ├── appsettings.json
    │   ├── Data/
    │   │   ├── AppDbContext.cs
    │   │   └── Migrations/
    │   ├── Models/
    │   │   ├── User.cs
    │   │   ├── Square.cs
    │   │   ├── Purchase.cs
    │   │   ├── PurchaseSquare.cs
    │   │   └── Enums/
    │   │       └── SquareStatus.cs
    │   ├── Models/Dtos/
    │   │   ├── RegisterDto.cs
    │   │   ├── LoginDto.cs
    │   │   ├── PurchaseRequestDto.cs
    │   │   ├── BulkStatusUpdateDto.cs
    │   │   └── SquareDto.cs
    │   └── Controllers/
    │       ├── AuthController.cs
    │       ├── RoadController.cs
    │       ├── PurchaseController.cs
    │       ├── MySquaresController.cs
    │       └── AdminController.cs
    └── DiamantLaan.Web/
        └── src/
            └── app/
                ├── app.component.ts
                ├── app.routes.ts
                ├── app.config.ts
                ├── models/
                │   └── (TypeScript interfaces)
                ├── services/
                │   ├── auth.service.ts
                │   ├── road.service.ts
                │   ├── purchase.service.ts
                │   └── admin.service.ts
                ├── guards/
                │   ├── auth.guard.ts
                │   └── admin.guard.ts
                ├── interceptors/
                │   └── auth.interceptor.ts
                └── components/
                    ├── home/
                    │   └── home.component.ts
                    ├── map/
                    │   └── map.component.ts
                    ├── login/
                    │   └── login.component.ts
                    ├── register/
                    │   └── register.component.ts
                    ├── my-squares/
                    │   └── my-squares.component.ts
                    ├── payment/
                    │   └── payment.component.ts
                    ├── admin/
                    │   └── admin.component.ts
                    └── shared/
                        ├── navbar/
                        │   └── navbar.component.ts
                        └── status-badge/
                            └── status-badge.component.ts
```

---

## Phase 1: Project Scaffolding

### Task 1: Create .NET solution and API project

**Files:**
- Create: `DiamantLaan.sln`
- Create: `src/DiamantLaan.Api/DiamantLaan.Api.csproj`
- Create: `src/DiamantLaan.Api/Program.cs` (minimal)
- Create: `src/DiamantLaan.Api/appsettings.json`

- [ ] **Step 1: Create solution and project**

```bash
mkdir -p src
dotnet new sln -n DiamantLaan -o .
dotnet new webapi -n DiamantLaan.Api -o src/DiamantLaan.Api --no-https
dotnet sln add src/DiamantLaan.Api/DiamantLaan.Api.csproj
```

- [ ] **Step 2: Add NuGet packages**

```bash
cd src/DiamantLaan.Api
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
```

- [ ] **Step 3: Verify build**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: scaffold .NET 8 Web API project with EF Core and JWT packages"
```

---

### Task 2: Scaffold Angular project

**Files:**
- Create: `src/DiamantLaan.Web/` (entire Angular project)

- [ ] **Step 1: Scaffold Angular app**

```bash
cd src
ng new DiamantLaan.Web --routing --style=scss --ssr=false --standalone=true --skip-tests=false
```
When prompted: don't add analytics.

- [ ] **Step 2: Verify Angular dev server works**

```bash
cd DiamantLaan.Web
npm start -- --port 4200 &
sleep 5
curl -s http://localhost:4200 | head -5
kill %1 2>/dev/null
```
Expected: HTML content returned.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: scaffold Angular 19 standalone project"
```

---

### Task 3: Configure .NET to serve Angular in production + CORS for dev

**Files:**
- Modify: `src/DiamantLaan.Api/Program.cs`
- Modify: `src/DiamantLaan.Api/DiamantLaan.Api.csproj`
- Create: `src/DiamantLaan.Api/Properties/launchSettings.json`

- [ ] **Step 1: Update .csproj to copy Angular build output on publish**

Add to `DiamantLaan.Api.csproj` inside `<Project>`:

```xml
<Target Name="BuildAngular" AfterTargets="Build" Condition="'$(Configuration)' == 'Release'">
  <Exec Command="npm install" WorkingDirectory="$(SolutionDir)src/DiamantLaan.Web" />
  <Exec Command="npm run build" WorkingDirectory="$(SolutionDir)src/DiamantLaan.Web" />
  <ItemGroup>
    <DistFiles Include="$(SolutionDir)src/DiamantLaan.Web/dist/**/*" />
  </ItemGroup>
  <Copy SourceFiles="@(DistFiles)" DestinationFolder="$(TargetDir)wwwroot\%(RecursiveDir)" />
</Target>
```

- [ ] **Step 2: Update Program.cs**

Write `Program.cs`:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS for Angular dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("DevCors");
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
```

- [ ] **Step 3: Update appsettings.json**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=DiamantLaan;Trusted_Connection=True;MultipleActiveResultSets=true"
  },
  "Jwt": {
    "Key": "DiamantLaanSuperSecretKey2026ForJwtTokenGeneration!",
    "Issuer": "DiamantLaanApi",
    "Audience": "DiamantLaanWeb",
    "ExpireMinutes": 1440
  }
}
```

- [ ] **Step 4: Verify dotnet build still works**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: configure CORS, static files, Angular build target"
```

---

## Phase 2: Backend — Data Layer

### Task 4: Create enums and entity models

**Files:**
- Create: `src/DiamantLaan.Api/Models/Enums/SquareStatus.cs`
- Create: `src/DiamantLaan.Api/Models/User.cs`
- Create: `src/DiamantLaan.Api/Models/Square.cs`
- Create: `src/DiamantLaan.Api/Models/Purchase.cs`
- Create: `src/DiamantLaan.Api/Models/PurchaseSquare.cs`

- [ ] **Step 1: Create SquareStatus enum**

`Models/Enums/SquareStatus.cs`:

```csharp
namespace DiamantLaan.Api.Models.Enums;

public enum SquareStatus
{
    NogNieBeginNie = 0,
    Voorberei = 1,
    BesigOmTeTeer = 2,
    KlaarGeteer = 3
}
```

- [ ] **Step 2: Create User entity**

`Models/User.cs`:

```csharp
using Microsoft.AspNetCore.Identity;

namespace DiamantLaan.Api.Models;

public class User : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public ICollection<Square> Squares { get; set; } = new List<Square>();
    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}
```

- [ ] **Step 3: Create Square entity**

`Models/Square.cs`:

```csharp
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

public class Square
{
    public int Id { get; set; }
    public SquareStatus Status { get; set; } = SquareStatus.NogNieBeginNie;
    public string? OwnerId { get; set; }
    public User? Owner { get; set; }
    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
```

- [ ] **Step 4: Create Purchase entity**

`Models/Purchase.cs`:

```csharp
namespace DiamantLaan.Api.Models;

public class Purchase
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; }
    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
```

- [ ] **Step 5: Create PurchaseSquare join entity**

`Models/PurchaseSquare.cs`:

```csharp
namespace DiamantLaan.Api.Models;

public class PurchaseSquare
{
    public int PurchaseId { get; set; }
    public Purchase Purchase { get; set; } = null!;
    public int SquareId { get; set; }
    public Square Square { get; set; } = null!;
}
```

- [ ] **Step 6: Verify build**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add entity models and SquareStatus enum"
```

---

### Task 5: Create DbContext

**Files:**
- Create: `src/DiamantLaan.Api/Data/AppDbContext.cs`
- Modify: `src/DiamantLaan.Api/Program.cs`

- [ ] **Step 1: Create AppDbContext**

`Data/AppDbContext.cs`:

```csharp
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
```

- [ ] **Step 2: Register DbContext in Program.cs**

Update `Program.cs` — add after `builder.Services.AddControllers()`:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
```

Also add the using: `using DiamantLaan.Api.Data;`

- [ ] **Step 3: Verify build**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add AppDbContext with entity configuration"
```

---

### Task 6: Create DTOs

**Files:**
- Create: `src/DiamantLaan.Api/Models/Dtos/RegisterDto.cs`
- Create: `src/DiamantLaan.Api/Models/Dtos/LoginDto.cs`
- Create: `src/DiamantLaan.Api/Models/Dtos/PurchaseRequestDto.cs`
- Create: `src/DiamantLaan.Api/Models/Dtos/BulkStatusUpdateDto.cs`
- Create: `src/DiamantLaan.Api/Models/Dtos/SquareDto.cs`

- [ ] **Step 1: Create all DTO files**

`Models/Dtos/RegisterDto.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class RegisterDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;
    [Required]
    public string FirstName { get; set; } = string.Empty;
    [Required]
    public string LastName { get; set; } = string.Empty;
}
```

`Models/Dtos/LoginDto.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class LoginDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required]
    public string Password { get; set; } = string.Empty;
}
```

`Models/Dtos/PurchaseRequestDto.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class PurchaseRequestDto
{
    [Required, MinLength(1)]
    public List<int> SquareIds { get; set; } = new();
}
```

`Models/Dtos/BulkStatusUpdateDto.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models.Dtos;

public class BulkStatusUpdateDto
{
    [Required, MinLength(1)]
    public List<int> SquareIds { get; set; } = new();
    [Required]
    public SquareStatus Status { get; set; }
}
```

`Models/Dtos/SquareDto.cs`:

```csharp
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models.Dtos;

public class SquareDto
{
    public int Id { get; set; }
    public SquareStatus Status { get; set; }
}
```

- [ ] **Step 2: Verify build**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add request/response DTOs"
```

---

## Phase 3: Identity & Auth

### Task 7: Configure ASP.NET Identity + JWT in Program.cs

**Files:**
- Modify: `src/DiamantLaan.Api/Program.cs`

- [ ] **Step 1: Update Program.cs with Identity and JWT configuration**

Replace the current `Program.cs` with:

```csharp
using System.Text;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("DevCors");
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
```

- [ ] **Step 2: Verify build**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: configure ASP.NET Identity and JWT authentication"
```

---

### Task 8: Create AuthController (register + login)

**Files:**
- Create: `src/DiamantLaan.Api/Controllers/AuthController.cs`

- [ ] **Step 1: Create AuthController**

`Controllers/AuthController.cs`:

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly IConfiguration _config;

    public AuthController(UserManager<User> userManager, IConfiguration config)
    {
        _userManager = userManager;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var user = new User
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        await _userManager.AddToRoleAsync(user, "Buyer");

        var token = GenerateJwtToken(user);
        return Ok(new { token, user.Email, user.FirstName, user.LastName });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
            return Unauthorized(new { message = "Ongeldige e-pos of wagwoord." });

        var token = GenerateJwtToken(user);
        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new { token, user.Email, user.FirstName, user.LastName, roles });
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.GivenName, user.FirstName),
            new(ClaimTypes.Surname, user.LastName)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:ExpireMinutes"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

- [ ] **Step 2: Verify build**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add AuthController with register and login endpoints"
```

---

### Task 9: Create initial migration, seed squares + admin user

**Files:**
- Create: `src/DiamantLaan.Api/Data/Migrations/` (generated)
- Modify: `src/DiamantLaan.Api/Data/AppDbContext.cs` (seed admin + squares)

- [ ] **Step 1: Generate EF migration**

```bash
cd src/DiamantLaan.Api
dotnet ef migrations add InitialCreate
```
Expected: Migration created under `Data/Migrations/`.

- [ ] **Step 2: Add seed method to AppDbContext**

Add to `AppDbContext.cs`:

```csharp
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Identity;

// Add after OnModelCreating:

public static async Task SeedAsync(UserManager<User> userManager, RoleManager<IdentityRole> roleManager, AppDbContext db)
{
    // Create roles
    if (!await roleManager.RoleExistsAsync("Admin"))
        await roleManager.CreateAsync(new IdentityRole("Admin"));
    if (!await roleManager.RoleExistsAsync("Buyer"))
        await roleManager.CreateAsync(new IdentityRole("Buyer"));

    // Create admin user
    var adminEmail = "admin@diamantlaan.co.za";
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
        await userManager.CreateAsync(admin, "Admin123!");
        await userManager.AddToRoleAsync(admin, "Admin");
    }

    // Seed squares if empty
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
```

- [ ] **Step 3: Call seed from Program.cs**

Add after `await app.Services.CreateScope()...` pattern at end of `Program.cs`, before `app.Run()`:

```csharp
// Seed database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var userManager = services.GetRequiredService<UserManager<User>>();
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    var db = services.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await AppDbContext.SeedAsync(userManager, roleManager, db);
}
```

- [ ] **Step 4: Verify build**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add initial migration, seed admin user and 4500 squares"
```

---

## Phase 4: Backend Controllers

### Task 10: RoadController + PurchaseController + MySquaresController

**Files:**
- Create: `src/DiamantLaan.Api/Controllers/RoadController.cs`
- Create: `src/DiamantLaan.Api/Controllers/PurchaseController.cs`
- Create: `src/DiamantLaan.Api/Controllers/MySquaresController.cs`

- [ ] **Step 1: Create RoadController**

`Controllers/RoadController.cs`:

```csharp
using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoadController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoadController(AppDbContext db) => _db = db;

    [HttpGet("squares")]
    public async Task<IActionResult> GetSquares()
    {
        var squares = await _db.Squares
            .OrderBy(s => s.Id)
            .Select(s => new SquareDto { Id = s.Id, Status = s.Status })
            .ToListAsync();

        return Ok(squares);
    }
}
```

- [ ] **Step 2: Create PurchaseController**

`Controllers/PurchaseController.cs`:

```csharp
using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PurchaseController : ControllerBase
{
    private readonly AppDbContext _db;

    public PurchaseController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> CreatePurchase([FromBody] PurchaseRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var squares = await _db.Squares
            .Where(s => dto.SquareIds.Contains(s.Id))
            .ToListAsync();

        if (squares.Count != dto.SquareIds.Count)
            return BadRequest(new { message = "Sommige blokke bestaan nie." });

        if (squares.Any(s => s.OwnerId != null))
            return BadRequest(new { message = "Sommige blokke is reeds verkoop." });

        if (squares.Any(s => s.Status != SquareStatus.NogNieBeginNie))
            return BadRequest(new { message = "Kan slegs blokke koop wat nog nie begin is nie." });

        decimal amount = squares.Count * 500m;

        var purchase = new Purchase
        {
            UserId = userId,
            Amount = amount
        };

        foreach (var square in squares)
        {
            square.OwnerId = userId;
            purchase.PurchaseSquares.Add(new PurchaseSquare { SquareId = square.Id });
        }

        _db.Purchases.Add(purchase);
        await _db.SaveChangesAsync();

        return Ok(new { purchaseId = purchase.Id, amount, squareCount = squares.Count });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPurchase(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (purchase == null)
            return NotFound();

        return Ok(new
        {
            purchase.Id,
            purchase.Amount,
            purchase.PurchaseDate,
            squares = purchase.PurchaseSquares.Select(ps => ps.SquareId)
        });
    }
}
```

- [ ] **Step 3: Create MySquaresController**

`Controllers/MySquaresController.cs`:

```csharp
using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MySquaresController : ControllerBase
{
    private readonly AppDbContext _db;

    public MySquaresController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetMySquares()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var squares = await _db.Squares
            .Where(s => s.OwnerId == userId)
            .OrderBy(s => s.Id)
            .Select(s => new SquareDto { Id = s.Id, Status = s.Status })
            .ToListAsync();

        return Ok(squares);
    }
}
```

- [ ] **Step 4: Verify build**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Road, Purchase, and MySquares controllers"
```

---

### Task 11: Create AdminController

**Files:**
- Create: `src/DiamantLaan.Api/Controllers/AdminController.cs`

- [ ] **Step 1: Create AdminController**

`Controllers/AdminController.cs`:

```csharp
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db) => _db = db;

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
            .Select(p => new
            {
                p.Id,
                UserName = p.User.FirstName + " " + p.User.LastName,
                UserEmail = p.User.Email,
                p.Amount,
                p.PurchaseDate,
                SquareCount = p.PurchaseSquares.Count
            })
            .ToListAsync();

        return Ok(purchases);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _db.Squares.CountAsync();
        var perStatus = await _db.Squares
            .GroupBy(s => s.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var klaarCount = perStatus.FirstOrDefault(x => x.Status == SquareStatus.KlaarGeteer)?.Count ?? 0;
        var progress = total > 0 ? Math.Round((double)klaarCount / total * 100, 1) : 0;

        var totalRaised = await _db.Purchases.SumAsync(p => p.Amount);

        return Ok(new
        {
            totalSquares = total,
            progress,
            totalRaised,
            perStatus
        });
    }
}
```

- [ ] **Step 2: Verify build**

```bash
dotnet build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add AdminController with bulk status update, purchases, stats"
```

---

## Phase 5: Frontend — Setup & Shared

### Task 12: Angular global styles, theming, and HTML shell

**Files:**
- Modify: `src/DiamantLaan.Web/src/styles.scss`
- Modify: `src/DiamantLaan.Web/src/index.html`

- [ ] **Step 1: Write global theme styles**

Replace `styles.scss`:

```scss
:root {
  --color-primary: #f97316;
  --color-primary-dark: #ea580c;
  --color-primary-light: #fff7ed;
  --color-bg: #ffffff;
  --color-surface: #f9fafb;
  --color-border: #e5e7eb;
  --color-text: #1f2937;
  --color-text-muted: #6b7280;
  --color-success: #22c55e;
  --color-warning: #fbbf24;
  --color-info: #3b82f6;
  --color-gray: #d1d5db;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--color-primary); text-decoration: none; }
a:hover { text-decoration: underline; }

button, .btn {
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.625rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}
.btn-primary:hover { background: var(--color-primary-dark); }

.btn-outline {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}
.btn-outline:hover { background: var(--color-primary-light); }

input, select {
  font-family: inherit;
  font-size: 0.875rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  width: 100%;
  outline: none;
}
input:focus, select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(249,115,22,0.15);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.card {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: var(--color-text-muted);
}

.status-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.status-0 { background: #e5e7eb; color: #6b7280; }
.status-1 { background: #fef3c7; color: #92400e; }
.status-2 { background: #dbeafe; color: #1e40af; }
.status-3 { background: #dcfce7; color: #166534; }
```

- [ ] **Step 2: Update index.html**

Replace `index.html`:

```html
<!doctype html>
<html lang="af">
<head>
  <meta charset="utf-8">
  <title>Diamant Laan Teerprojek</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add global styles and Afrikaans HTML shell"
```

---

### Task 13: Create TypeScript models and HTTP services

**Files:**
- Create: `src/DiamantLaan.Web/src/app/models/square.ts`
- Create: `src/DiamantLaan.Web/src/app/models/user.ts`
- Create: `src/DiamantLaan.Web/src/app/services/auth.service.ts`
- Create: `src/DiamantLaan.Web/src/app/services/road.service.ts`
- Create: `src/DiamantLaan.Web/src/app/services/purchase.service.ts`
- Create: `src/DiamantLaan.Web/src/app/services/admin.service.ts`
- Create: `src/DiamantLaan.Web/src/app/interceptors/auth.interceptor.ts`
- Modify: `src/DiamantLaan.Web/src/app/app.config.ts`

- [ ] **Step 1: Create models**

`models/square.ts`:

```typescript
export enum SquareStatus {
  NogNieBeginNie = 0,
  Voorberei = 1,
  BesigOmTeTeer = 2,
  KlaarGeteer = 3
}

export interface Square {
  id: number;
  status: SquareStatus;
}

export const STATUS_LABELS: Record<SquareStatus, string> = {
  [SquareStatus.NogNieBeginNie]: 'Nog nie begin nie',
  [SquareStatus.Voorberei]: 'Voorberei',
  [SquareStatus.BesigOmTeTeer]: 'Besig om te teer',
  [SquareStatus.KlaarGeteer]: 'Klaar geteer'
};
```

`models/user.ts`:

```typescript
export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: string[];
}
```

- [ ] **Step 2: Create auth service + interceptor**

`services/auth.service.ts`:

```typescript
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthResponse } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = '/api/auth';
  currentUser = signal<AuthResponse | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  register(firstName: string, lastName: string, email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/register`, { firstName, lastName, email, password })
      .pipe(tap(res => this.setSession(res)));
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password })
      .pipe(tap(res => this.setSession(res)));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  isAdmin(): boolean {
    const user = this.currentUser();
    return user?.roles?.includes('Admin') ?? false;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res));
    this.currentUser.set(res);
  }

  private loadUser(): AuthResponse | null {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  }
}
```

`interceptors/auth.interceptor.ts`:

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
```

- [ ] **Step 3: Create business services**

`services/road.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Square } from '../models/square';

@Injectable({ providedIn: 'root' })
export class RoadService {
  constructor(private http: HttpClient) {}

  getSquares() {
    return this.http.get<Square[]>('/api/road/squares');
  }
}
```

`services/purchase.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  constructor(private http: HttpClient) {}

  createPurchase(squareIds: number[]) {
    return this.http.post<{ purchaseId: number; amount: number; squareCount: number }>(
      '/api/purchase', { squareIds }
    );
  }

  getPurchase(id: number) {
    return this.http.get<any>(`/api/purchase/${id}`);
  }

  getMySquares() {
    return this.http.get<any[]>('/api/my-squares');
  }
}
```

`services/admin.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SquareStatus } from '../models/square';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  updateStatus(squareIds: number[], status: SquareStatus) {
    return this.http.put<any>('/api/admin/squares/status', { squareIds, status });
  }

  getPurchases() {
    return this.http.get<any[]>('/api/admin/purchases');
  }

  getStats() {
    return this.http.get<any>('/api/admin/stats');
  }
}
```

- [ ] **Step 4: Update app.config.ts with interceptor + provideHttpClient**

`app.config.ts`:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ]
};
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add TypeScript models, HTTP services, auth interceptor"
```

---

### Task 14: Routes, guards, and shared components

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/app.routes.ts`
- Create: `src/DiamantLaan.Web/src/app/guards/auth.guard.ts`
- Create: `src/DiamantLaan.Web/src/app/guards/admin.guard.ts`
- Create: `src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts`
- Create: `src/DiamantLaan.Web/src/app/components/shared/status-badge/status-badge.component.ts`
- Modify: `src/DiamantLaan.Web/src/app/app.component.ts`

- [ ] **Step 1: Create guards**

`guards/auth.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const user = inject(AuthService).currentUser();
  return user ? true : inject(Router).parseUrl('/meld-aan');
};
```

`guards/admin.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard = () => {
  return inject(AuthService).isAdmin()
    ? true
    : inject(Router).parseUrl('/');
};
```

- [ ] **Step 2: Define routes**

`app.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) },
  { path: 'kaart', loadComponent: () => import('./components/map/map.component').then(m => m.MapComponent) },
  { path: 'registreer', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
  { path: 'meld-aan', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'my-blokke', loadComponent: () => import('./components/my-squares/my-squares.component').then(m => m.MySquaresComponent), canActivate: [authGuard] },
  { path: 'betaal', loadComponent: () => import('./components/payment/payment.component').then(m => m.PaymentComponent), canActivate: [authGuard] },
  { path: 'admin', loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent), canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: '' }
];
```

- [ ] **Step 3: Create Navbar component**

`components/shared/navbar/navbar.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="container navbar-inner">
        <a routerLink="/" class="navbar-brand">Diamant Laan Teerprojek</a>
        <div class="navbar-links">
          @if (auth.currentUser(); as user) {
            <a routerLink="/my-blokke">My Blokke</a>
            @if (auth.isAdmin()) {
              <a routerLink="/admin">Admin</a>
            }
            <span class="navbar-user">{{ user.firstName }}</span>
            <button class="btn btn-outline btn-sm" (click)="auth.logout()">Teken Uit</button>
          } @else {
            <a routerLink="/registreer">Registreer</a>
            <a routerLink="/meld-aan">Meld Aan</a>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: var(--color-primary);
      color: #fff;
      padding: 0.75rem 0;
    }
    .navbar-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .navbar-brand {
      color: #fff;
      font-weight: 700;
      font-size: 1.125rem;
      text-decoration: none;
    }
    .navbar-links {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .navbar-links a {
      color: rgba(255,255,255,0.9);
      font-size: 0.8125rem;
      font-weight: 500;
      text-decoration: none;
    }
    .navbar-links a:hover { color: #fff; }
    .navbar-user { font-size: 0.8125rem; opacity: 0.8; }
    .btn-sm { padding: 0.25rem 0.75rem; font-size: 0.75rem; }
    .btn-outline { border-color: #fff; color: #fff; }
    .btn-outline:hover { background: rgba(255,255,255,0.15); }
  `]
})
export class NavbarComponent {
  auth = inject(AuthService);
}
```

- [ ] **Step 4: Create StatusBadge component**

`components/shared/status-badge/status-badge.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { SquareStatus, STATUS_LABELS } from '../../../models/square';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="status-badge status-{{ status }}">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: SquareStatus;
  get label(): string { return STATUS_LABELS[this.status]; }
}
```

- [ ] **Step 5: Update AppComponent**

`app.component.ts`:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <main>
      <router-outlet></router-outlet>
    </main>
  `
})
export class AppComponent {}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add routes, guards, navbar, status badge, app shell"
```

---

## Phase 6: Frontend — Page Components

### Task 15: Home page

**Files:**
- Create: `src/DiamantLaan.Web/src/app/components/home/home.component.ts`

- [ ] **Step 1: Create HomeComponent**

`components/home/home.component.ts`:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="hero">
      <div class="hero-map">
        <svg viewBox="0 0 400 280" class="road-svg">
          <!-- Segment 1: straight vertical 130m -->
          <rect x="185" y="20" width="30" height="80" rx="4" fill="var(--color-primary)" opacity="0.8"/>
          <!-- Curve 1: left turn 100m -->
          <path d="M185 100 Q185 140 140 145" stroke="var(--color-primary)" stroke-width="30" fill="none" stroke-linecap="round" opacity="0.8"/>
          <!-- Segment 3: straight horizontal 170m -->
          <rect x="30" y="133" width="105" height="24" rx="4" fill="var(--color-primary)" opacity="0.8"/>
          <!-- Curve 2: right turn -->
          <path d="M135 133 Q180 133 185 170" stroke="var(--color-primary)" stroke-width="28" fill="none" stroke-linecap="round" opacity="0.8"/>
          <!-- Segment 5: straight vertical 290m -->
          <rect x="172" y="40" width="24" height="110" rx="4" fill="var(--color-primary)" opacity="0.8"/>
        </svg>
      </div>
    </div>
    <div class="container hero-text">
      <h1>Help ons teer Diamant Laan!</h1>
      <p class="subtitle">Koop 'n vierkante meter vir R500 — en volg jou stukkie pad se vordering.</p>
      <a routerLink="/kaart" class="btn btn-primary">Sien Kaart & Koop &raquo;</a>
      <div class="stats">
        <div class="stat">
          <strong>{{ progress }}%</strong>
          <span>voltooi</span>
        </div>
        <div class="stat">
          <strong>R{{ totalRaised | number:'1.0-0' }}</strong>
          <span>ingesamel</span>
        </div>
        <div class="stat">
          <strong>R500</strong>
          <span>per m&sup2;</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero {
      background: var(--color-primary-light);
    }
    .hero-map {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem 1rem 0;
    }
    .road-svg {
      width: 100%;
      height: auto;
    }
    .hero-text {
      text-align: center;
      padding: 2rem 1rem 3rem;
    }
    .hero-text h1 {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }
    .subtitle {
      color: var(--color-text-muted);
      margin-bottom: 1.5rem;
      font-size: 0.9375rem;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 2rem;
    }
    .stat {
      text-align: center;
    }
    .stat strong {
      display: block;
      font-size: 1.25rem;
      color: var(--color-primary);
    }
    .stat span {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    @media (max-width: 480px) {
      .hero-text h1 { font-size: 1.25rem; }
      .stats { gap: 1rem; }
    }
  `]
})
export class HomeComponent implements OnInit {
  private admin = inject(AdminService);
  progress = 0;
  totalRaised = 0;

  ngOnInit() {
    this.admin.getStats().subscribe(stats => {
      this.progress = stats.progress;
      this.totalRaised = stats.totalRaised;
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add homepage with hero SVG map and stats"
```

---

### Task 16: Login and Register pages

**Files:**
- Create: `src/DiamantLaan.Web/src/app/components/login/login.component.ts`
- Create: `src/DiamantLaan.Web/src/app/components/register/register.component.ts`

- [ ] **Step 1: Create LoginComponent**

`components/login/login.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="auth-card">
        <h2>Meld Aan</h2>
        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label>E-pos</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email">
          </div>
          <div class="form-group">
            <label>Wagwoord</label>
            <input type="password" [(ngModel)]="password" name="password" required autocomplete="current-password">
          </div>
          @if (error) {
            <p class="error">{{ error }}</p>
          }
          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Besig...' : 'Meld Aan' }}
          </button>
        </form>
        <p class="auth-link">Nog nie 'n rekening? <a routerLink="/registreer">Registreer hier</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-card {
      max-width: 400px;
      margin: 3rem auto;
      padding: 2rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }
    .auth-card h2 { margin-bottom: 1.5rem; }
    .auth-link { margin-top: 1rem; font-size: 0.875rem; text-align: center; }
    .error { color: #ef4444; font-size: 0.8125rem; margin-bottom: 0.75rem; }
    button { width: 100%; margin-top: 0.5rem; }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = '';
  password = '';
  error = '';
  loading = false;

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/kaart']),
      error: (err) => { this.error = err.error?.message || 'Aanmelding het misluk.'; this.loading = false; }
    });
  }
}
```

- [ ] **Step 2: Create RegisterComponent**

`components/register/register.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="auth-card">
        <h2>Registreer</h2>
        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label>Naam</label>
            <input type="text" [(ngModel)]="firstName" name="firstName" required>
          </div>
          <div class="form-group">
            <label>Van</label>
            <input type="text" [(ngModel)]="lastName" name="lastName" required>
          </div>
          <div class="form-group">
            <label>E-pos</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email">
          </div>
          <div class="form-group">
            <label>Wagwoord</label>
            <input type="password" [(ngModel)]="password" name="password" required autocomplete="new-password" minlength="6">
          </div>
          @if (error) {
            <p class="error">{{ error }}</p>
          }
          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Besig...' : 'Registreer' }}
          </button>
        </form>
        <p class="auth-link">Reeds 'n rekening? <a routerLink="/meld-aan">Meld aan hier</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-card {
      max-width: 400px;
      margin: 3rem auto;
      padding: 2rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }
    .auth-card h2 { margin-bottom: 1.5rem; }
    .auth-link { margin-top: 1rem; font-size: 0.875rem; text-align: center; }
    .error { color: #ef4444; font-size: 0.8125rem; margin-bottom: 0.75rem; }
    button { width: 100%; margin-top: 0.5rem; }
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  error = '';
  loading = false;

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.register(this.firstName, this.lastName, this.email, this.password).subscribe({
      next: () => this.router.navigate(['/kaart']),
      error: (err) => { this.error = err.error?.message || 'Registrasie het misluk.'; this.loading = false; }
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add login and register pages"
```

---

### Task 17: Interactive road map page (SVG)

**Files:**
- Create: `src/DiamantLaan.Web/src/app/components/map/map.component.ts`
- Create: `src/DiamantLaan.Web/src/app/components/map/map-segments.ts` (hardcoded segment layout)

- [ ] **Step 1: Create segment layout data**

`components/map/map-segments.ts`:

```typescript
export interface SegmentDef {
  name: string;
  startId: number;
  endId: number;
  length: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
  cellW: number;
  cellH: number;
}

// Road: 6m wide = 6 rows. Squares numbered 1-4500 sequentially.
// SVG positions are viewBox coordinates (1200x900 roughly)

export const SEGMENTS: SegmentDef[] = [
  {
    name: 'Reguit 130m',
    startId: 1, endId: 780,
    length: 130,
    x: 400, y: 50, width: 30, height: 260,
    rows: 6, cols: 130, cellW: 5, cellH: 2,
  },
  {
    name: 'Draai Links 100m',
    startId: 781, endId: 1380,
    length: 100,
    x: 350, y: 300, width: 60, height: 60,
    rows: 6, cols: 100, cellW: 2, cellH: 2,
  },
  {
    name: 'Reguit 170m',
    startId: 1381, endId: 2400,
    length: 170,
    x: 50, y: 340, width: 340, height: 30,
    rows: 6, cols: 170, cellW: 2, cellH: 5,
  },
  {
    name: 'Draai Regs',
    startId: 2401, endId: 2460,
    length: 10,
    x: 385, y: 310, width: 35, height: 35,
    rows: 6, cols: 10, cellW: 2, cellH: 2,
  },
  {
    name: 'Reguit 290m',
    startId: 2461, endId: 4200,
    length: 290,
    x: 420, y: 30, width: 30, height: 580,
    rows: 6, cols: 290, cellW: 5, cellH: 2,
  },
];
```

- [ ] **Step 2: Create MapComponent**

`components/map/map.component.ts`:

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RoadService } from '../../services/road.service';
import { PurchaseService } from '../../services/purchase.service';
import { AuthService } from '../../services/auth.service';
import { Square, SquareStatus } from '../../models/square';
import { SEGMENTS, SegmentDef } from './map-segments';

const STATUS_COLORS: Record<number, string> = {
  0: '#d1d5db', 1: '#fbbf24', 2: '#3b82f6', 3: '#22c55e'
};

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container map-page">
      <div class="map-header">
        <h2>Diamant Laan — Kies jou blokke</h2>
        <div class="legend">
          <span><span class="dot" style="background:#d1d5db"></span> Nog nie begin nie</span>
          <span><span class="dot" style="background:#fbbf24"></span> Voorberei</span>
          <span><span class="dot" style="background:#3b82f6"></span> Besig om te teer</span>
          <span><span class="dot" style="background:#22c55e"></span> Klaar geteer</span>
        </div>
      </div>
      <div class="map-layout">
        <div class="svg-container">
          <svg viewBox="0 0 500 620" class="road-map-svg">
            @for (seg of segments; track seg.name) {
              @for (row of range(seg.rows); track row) {
                @for (col of range(seg.cols); track col) {
                  @let sqId = seg.startId + col * seg.rows + row;
                  @if (sqId <= seg.endId) {
                    @let sx = seg.x + col * seg.cellW;
                    @let sy = seg.y + row * seg.cellH;
                    <rect
                      [attr.x]="sx" [attr.y]="sy"
                      [attr.width]="seg.cellW - 0.5" [attr.height]="seg.cellH - 0.5"
                      [attr.fill]="getColor(sqId)"
                      [attr.stroke]="selectedIds().has(sqId) ? '#f97316' : 'rgba(0,0,0,0.08)'"
                      [attr.stroke-width]="selectedIds().has(sqId) ? 2 : 0.5"
                      [attr.rx]="1"
                      style="cursor:pointer"
                      (click)="toggleSquare(sqId)"
                      (mouseenter)="hoveredId = sqId"
                      (mouseleave)="hoveredId = null">
                      <title>Blok #{{ sqId }}</title>
                    </rect>
                  }
                }
              }
            }
          </svg>
        </div>
        <div class="sidebar">
          <div class="sidebar-inner">
            <h3>Gekies</h3>
            <p>{{ selectedIds().size }} blokke</p>
            <p class="total">Totaal: R{{ selectedIds().size * 500 }}</p>
            @if (selectedIds().size > 0) {
              <button class="btn btn-primary" (click)="checkout()">
                Gaan na Betaling
              </button>
            }
            @if (message) {
              <p class="msg" [class.error]="isError">{{ message }}</p>
            }
            <div class="saved-purchases">
              <h4>My Blokke</h4>
              @if (mySquareIds().length === 0) {
                <p class="empty">Nog geen blokke gekoop nie.</p>
              }
              @for (id of mySquareIds(); track id) {
                <span class="owned-chip">#{{ id }}</span>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-page { padding: 1rem 0; }
    .map-header { margin-bottom: 1rem; }
    .map-header h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    .legend { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.75rem; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 3px; vertical-align: middle; }
    .map-layout { display: flex; gap: 1rem; }
    .svg-container { flex: 1; min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; background: #fafafa; }
    .road-map-svg { width: 100%; height: auto; display: block; }
    .sidebar { width: 240px; flex-shrink: 0; }
    .sidebar-inner { border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1rem; position: sticky; top: 1rem; }
    .sidebar-inner h3 { margin-bottom: 0.25rem; }
    .sidebar-inner h4 { margin-top: 1rem; margin-bottom: 0.25rem; font-size: 0.8125rem; }
    .total { font-weight: 700; color: var(--color-primary); margin-bottom: 0.75rem; }
    .msg { font-size: 0.75rem; margin-top: 0.5rem; color: var(--color-success); }
    .msg.error { color: #ef4444; }
    .empty { font-size: 0.75rem; color: var(--color-text-muted); }
    .owned-chip { display: inline-block; background: var(--color-primary-light); color: var(--color-primary); font-size: 0.6875rem; padding: 0.125rem 0.375rem; border-radius: 4px; margin: 2px; }
    @media (max-width: 768px) {
      .map-layout { flex-direction: column; }
      .sidebar { width: 100%; }
    }
  `]
})
export class MapComponent implements OnInit {
  private road = inject(RoadService);
  private purchase = inject(PurchaseService);
  private auth = inject(AuthService);
  private router = inject(Router);

  segments = SEGMENTS;
  squares: Square[] = [];
  selectedIds = signal<Set<number>>(new Set());
  mySquareIds = signal<number[]>([]);
  message = '';
  isError = false;
  hoveredId: number | null = null;

  ngOnInit() {
    this.road.getSquares().subscribe(data => this.squares = data);
    if (this.auth.currentUser()) {
      this.purchase.getMySquares().subscribe(s => this.mySquareIds.set(s.map(x => x.id)));
    }
  }

  getColor(squareId: number): string {
    const sq = this.squares.find(s => s.id === squareId);
    return sq ? STATUS_COLORS[sq.status] : STATUS_COLORS[0];
  }

  toggleSquare(sqId: number) {
    if (!this.auth.currentUser()) {
      this.router.navigate(['/meld-aan']);
      return;
    }
    const sq = this.squares.find(s => s.id === sqId);
    if (sq && sq.status !== SquareStatus.NogNieBeginNie) return;
    if (sqId > this.segments[this.segments.length-1].endId) return;

    const selected = new Set(this.selectedIds());
    if (selected.has(sqId)) {
      selected.delete(sqId);
    } else {
      selected.add(sqId);
    }
    this.selectedIds.set(selected);
    this.message = '';
  }

  checkout() {
    if (this.selectedIds().size === 0) return;
    const ids = Array.from(this.selectedIds());
    this.purchase.createPurchase(ids).subscribe({
      next: (res) => {
        this.message = `${res.squareCount} blokke gekoop vir R${res.amount}!`;
        this.selectedIds.set(new Set());
        this.purchase.getMySquares().subscribe(s => this.mySquareIds.set(s.map(x => x.id)));
        this.road.getSquares().subscribe(data => this.squares = data);
      },
      error: (err) => {
        this.message = err.error?.message || 'Kon nie koop nie.';
        this.isError = true;
      }
    });
  }

  range(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add interactive SVG road map with square selection"
```

---

### Task 18: My Squares page

**Files:**
- Create: `src/DiamantLaan.Web/src/app/components/my-squares/my-squares.component.ts`

- [ ] **Step 1: Create MySquaresComponent**

`components/my-squares/my-squares.component.ts`:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { PurchaseService } from '../../services/purchase.service';
import { Square, SquareStatus, STATUS_LABELS } from '../../models/square';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-my-squares',
  standalone: true,
  imports: [StatusBadgeComponent],
  template: `
    <div class="container">
      <h2>My Blokke</h2>
      @if (squares.length === 0) {
        <p class="empty">Jy het nog geen blokke gekoop nie.</p>
      } @else {
        <p>{{ squares.length }} blokke gekoop — R{{ squares.length * 500 | number:'1.0-0' }} totaal</p>
        <div class="grid">
          @for (sq of squares; track sq.id) {
            <div class="sq-card">
              <strong>#{{ sq.id }}</strong>
              <app-status-badge [status]="sq.status"></app-status-badge>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1rem; max-width: 800px; }
    h2 { margin-bottom: 0.5rem; }
    .empty { color: var(--color-text-muted); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .sq-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `]
})
export class MySquaresComponent implements OnInit {
  private purchase = inject(PurchaseService);
  squares: { id: number; status: SquareStatus }[] = [];

  ngOnInit() {
    this.purchase.getMySquares().subscribe(s => this.squares = s);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add My Squares page"
```

---

### Task 19: Payment page (mock)

**Files:**
- Create: `src/DiamantLaan.Web/src/app/components/payment/payment.component.ts`

- [ ] **Step 1: Create PaymentComponent**

`components/payment/payment.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="payment-card">
        <h2>Betaling</h2>
        <div class="placeholder-box">
          <p class="big-text">Stripe / PayFast hier</p>
          <p class="small-text">Betaling word in die toekoms geintegreer.</p>
        </div>
        <div class="actions">
          <a routerLink="/my-blokke" class="btn btn-primary">Gaan na My Blokke</a>
          <a routerLink="/kaart" class="btn btn-outline">Koop Nog Blokke</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1rem; }
    .payment-card { max-width: 500px; margin: 2rem auto; text-align: center; }
    h2 { margin-bottom: 1.5rem; }
    .placeholder-box {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius);
      padding: 3rem 1rem;
      margin-bottom: 1.5rem;
      background: var(--color-surface);
    }
    .big-text { font-size: 1.25rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: 0.5rem; }
    .small-text { font-size: 0.8125rem; color: var(--color-text-muted); }
    .actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
  `]
})
export class PaymentComponent {}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add mock payment page with Stripe/PayFast placeholder"
```

---

### Task 20: Admin dashboard

**Files:**
- Create: `src/DiamantLaan.Web/src/app/components/admin/admin.component.ts`

- [ ] **Step 1: Create AdminComponent**

`components/admin/admin.component.ts`:

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { RoadService } from '../../services/road.service';
import { Square, SquareStatus, STATUS_LABELS } from '../../models/square';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';

const STATUS_OPTIONS: SquareStatus[] = [SquareStatus.Voorberei, SquareStatus.BesigOmTeTeer, SquareStatus.KlaarGeteer];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent],
  template: `
    <div class="container">
      <h2>Admin Paneel</h2>
      <div class="stats-bar">
        <div class="stat"><strong>Progress:</strong> {{ stats.progress }}%</div>
        <div class="stat"><strong>Ingesamel:</strong> R{{ stats.totalRaised | number:'1.0-0' }}</div>
      </div>
      <div class="controls">
        <select [(ngModel)]="filterStatus">
          <option value="">Alle statusse</option>
          <option value="0">Nog nie begin nie</option>
          <option value="1">Voorberei</option>
          <option value="2">Besig om te teer</option>
          <option value="3">Klaar geteer</option>
        </select>
        @if (selectedIds().size > 0) {
          <select [(ngModel)]="targetStatus" (change)="updateStatus()">
            <option value="">Stel in as...</option>
            @for (s of STATUS_OPTIONS; track s) {
              <option [value]="s">{{ STATUS_LABELS[s] }}</option>
            }
          </select>
        }
        <button class="btn btn-outline btn-sm" (click)="clearSelection()">
          Maak Keuses Skoon ({{ selectedIds().size }})
        </button>
      </div>
      @if (message) {
        <p class="msg" [class.error]="isError">{{ message }}</p>
      }
      <div class="square-grid">
        @for (sq of filteredSquares(); track sq.id) {
          <div
            class="sq"
            [class.selected]="selectedIds().has(sq.id)"
            [style.background]="colorMap[sq.status]"
            [title]="'#' + sq.id + ' — ' + STATUS_LABELS[sq.status]"
            (click)="toggle(sq)"
          ></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1rem; }
    h2 { margin-bottom: 0.5rem; }
    .stats-bar { display: flex; gap: 2rem; margin-bottom: 1rem; font-size: 0.875rem; }
    .controls { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .controls select { width: auto; min-width: 180px; }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
    .msg { font-size: 0.8125rem; margin-bottom: 0.5rem; color: var(--color-success); }
    .msg.error { color: #ef4444; }
    .square-grid {
      display: grid;
      grid-template-columns: repeat(50, minmax(0, 1fr));
      gap: 1px;
      border: 1px solid var(--color-border);
      background: #e5e7eb;
      max-height: 70vh;
      overflow-y: auto;
    }
    .sq {
      aspect-ratio: 1;
      cursor: pointer;
      transition: transform 0.1s;
    }
    .sq:hover { transform: scale(1.3); z-index: 1; }
    .sq.selected { outline: 2px solid #f97316; outline-offset: -1px; }
    @media (max-width: 480px) {
      .square-grid { grid-template-columns: repeat(25, minmax(0, 1fr)); }
    }
  `]
})
export class AdminComponent implements OnInit {
  private admin = inject(AdminService);
  private road = inject(RoadService);

  squares: Square[] = [];
  stats = { progress: 0, totalRaised: 0 };
  selectedIds = signal<Set<number>>(new Set());
  filterStatus = '';
  targetStatus: SquareStatus | null = null;
  message = '';
  isError = false;
  colorMap: Record<number, string> = { 0: '#d1d5db', 1: '#fbbf24', 2: '#3b82f6', 3: '#22c55e' };
  STATUS_LABELS = STATUS_LABELS;
  STATUS_OPTIONS = STATUS_OPTIONS;

  ngOnInit() {
    this.refresh();
  }

  filteredSquares() {
    if (this.filterStatus === '') return this.squares;
    return this.squares.filter(s => s.status === parseInt(this.filterStatus));
  }

  toggle(sq: Square) {
    const selected = new Set(this.selectedIds());
    selected.has(sq.id) ? selected.delete(sq.id) : selected.add(sq.id);
    this.selectedIds.set(selected);
  }

  clearSelection() { this.selectedIds.set(new Set()); this.message = ''; }

  updateStatus() {
    this.message = ''; this.isError = false;
    if (!this.targetStatus || this.selectedIds().size === 0) return;
    const ids = Array.from(this.selectedIds());
    this.admin.updateStatus(ids, this.targetStatus).subscribe({
      next: () => {
        this.message = `${ids.length} blokke opgedateer.`;
        this.refresh();
        this.clearSelection();
      },
      error: (err) => {
        this.message = err.error?.message || 'Opdatering het misluk.';
        this.isError = true;
      }
    });
  }

  private refresh() {
    this.admin.getStats().subscribe(s => this.stats = s);
    this.road.getSquares().subscribe(s => this.squares = s);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add admin dashboard with bulk status update"
```

---

## Phase 7: Integration & Verification

### Task 21: Verify full stack works end-to-end

- [ ] **Step 1: Build and run backend**

```bash
cd src/DiamantLaan.Api
dotnet build
dotnet run
```
Wait for "Now listening on..." message.

- [ ] **Step 2: Test API endpoints via curl**

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'

# Get squares (public)
curl http://localhost:5000/api/road/squares | jq '.[0:3]'
```

- [ ] **Step 3: Run Angular dev server**

```bash
cd src/DiamantLaan.Web
npm start
```
Navigate to http://localhost:4200. Verify: homepage loads, navbar works, map is visible.

- [ ] **Step 4: Test purchase flow in browser**
1. Register a new user
2. Navigate to /kaart
3. Click squares → verify they highlight orange
4. Click "Gaan na Betaling"
5. Verify mock payment page
6. Navigate to /my-blokke → squares should appear

- [ ] **Step 5: Test admin flow in browser**
1. Login as admin@diamantlaan.co.za / Admin123!
2. Navigate to /admin
3. Filter squares, select some
4. Change status → verify colors update
5. Check /kaart → status changes should be visible

- [ ] **Step 6: Fix any issues, then final commit**

```bash
git add -A && git commit -m "chore: final integration fixes"
```

---

## Summary

**Total tasks:** 21
**Phases:** 7 (Scaffolding → Data Layer → Identity/Auth → Controllers → Frontend Setup → Page Components → Integration)

**Key design decisions:**
- Square layout hardcoded in frontend (`map-segments.ts`)
- Squares 1-4500, all pre-seeded in DB
- JWT auth with ASP.NET Identity roles
- SVG for road map (interactive rects)
- Mock payment (placeholder only)
- All Afrikaans UI

---
