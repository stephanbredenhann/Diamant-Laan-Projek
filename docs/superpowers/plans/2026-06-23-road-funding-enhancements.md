# Road Funding Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement five enhancements: fix square overlap at road curves, add sponsor designation and public square marking, allow purchasing squares at any status, add phone/resident fields to registration, and build a full admin statistics dashboard.

**Architecture:** Backend changes to ASP.NET Core 8 API (Entity Framework Core + SQLite) — new Square fields, new User field, enhanced admin endpoints. Frontend changes to Angular 19 SPA — arc-length-adjusted geometry in coordinate-config.ts, sponsor styling in road-map component, new fields in registration form, and a new `/admin/stats` component using Chart.js.

**Tech Stack:** ASP.NET Core 8, Entity Framework Core 8 (SQLite), Angular 19.2 (standalone), Leaflet 1.9, Chart.js + ng2-charts

---

## File Structure Map

| File | Role |
|------|------|
| `src/DiamantLaan.Api/Models/Enums/SponsorshipType.cs` | New enum: None, OraniaOntwikkelingsMaatskapy, OraniaDorpstraad |
| `src/DiamantLaan.Api/Models/Square.cs` | Add SponsorshipType, IsPublicSquare |
| `src/DiamantLaan.Api/Models/User.cs` | Add IsOraniaResident |
| `src/DiamantLaan.Api/Models/Dtos/RegisterDto.cs` | Add PhoneNumber, IsOraniaResident |
| `src/DiamantLaan.Api/Models/Dtos/SquareDto.cs` | Add SponsorshipType, IsPublicSquare |
| `src/DiamantLaan.Api/Models/Dtos/DailySalesDto.cs` | New DTO for daily sales data |
| `src/DiamantLaan.Api/Models/Dtos/BuyerDto.cs` | New DTO for buyer info |
| `src/DiamantLaan.Api/Data/AppDbContext.cs` | Update seed data (4200 squares with sponsors) |
| `src/DiamantLaan.Api/Controllers/AuthController.cs` | Store phone + resident; add resident to JWT claims |
| `src/DiamantLaan.Api/Controllers/RoadController.cs` | Return sponsorship fields |
| `src/DiamantLaan.Api/Controllers/PurchaseController.cs` | Remove status gate |
| `src/DiamantLaan.Api/Controllers/AdminController.cs` | Add daily-sales, buyers, enhanced stats endpoints |
| `src/DiamantLaan.Api/Migrations/*.cs` | Two new migrations |
| `src/DiamantLaan.Web/package.json` | Add chart.js, ng2-charts |
| `src/DiamantLaan.Web/src/app/models/square.ts` | Add SponsorshipType enum, sponsorship fields |
| `src/DiamantLaan.Web/src/app/models/user.ts` | Add phone, isOraniaResident |
| `src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts` | Arc-length-adjusted spacing at curves; pass sponsorship props |
| `src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.ts` | Sponsor colors, tooltips with sponsor name + "Dra ook by" |
| `src/DiamantLaan.Web/src/app/components/map/map.component.ts` | Remove status filter from selection |
| `src/DiamantLaan.Web/src/app/components/register/register.component.ts` | Add phone/resident fields |
| `src/DiamantLaan.Web/src/app/services/auth.service.ts` | Update register() signature |
| `src/DiamantLaan.Web/src/app/services/admin.service.ts` | Add dailySales, buyers, enhanced stats methods |
| `src/DiamantLaan.Web/src/app/components/admin/admin-stats.component.ts` | New: full stats dashboard with charts + buyer table |
| `src/DiamantLaan.Web/src/app/app.routes.ts` | Add `/admin/stats` route |
| `src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts` | Add "Statistiek" link for admin |
| `src/DiamantLaan.Web/src/app/app.config.ts` | Register ng2-charts providers |

---

### Task 1: Create SponsorshipType enum + update Square model

**Files:**
- Create: `src/DiamantLaan.Api/Models/Enums/SponsorshipType.cs`
- Modify: `src/DiamantLaan.Api/Models/Square.cs`

- [ ] **Step 1: Create SponsorshipType enum**

```csharp
namespace DiamantLaan.Api.Models.Enums;

public enum SponsorshipType
{
    None = 0,
    OraniaOntwikkelingsMaatskapy = 1,
    OraniaDorpstraad = 2
}
```

Write to `src/DiamantLaan.Api/Models/Enums/SponsorshipType.cs`.

- [ ] **Step 2: Update Square.cs — add SponsorshipType and IsPublicSquare**

Replace `src/DiamantLaan.Api/Models/Square.cs`:

```csharp
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

public class Square
{
    public int Id { get; set; }
    public SquareStatus Status { get; set; } = SquareStatus.NogNieBeginNie;
    public string? OwnerId { get; set; }
    public User? Owner { get; set; }
    public SponsorshipType SponsorshipType { get; set; } = SponsorshipType.None;
    public bool IsPublicSquare { get; set; }
    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
```

- [ ] **Step 3: Verify it compiles**

Run: `dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Api/Models/Enums/SponsorshipType.cs src/DiamantLaan.Api/Models/Square.cs
git commit -m "feat: add SponsorshipType and IsPublicSquare to Square model"
```

---

### Task 2: Create sponsorship migration

**Files:**
- Create: `src/DiamantLaan.Api/Migrations/` (generated files)

- [ ] **Step 1: Add EF Core tooling if needed and create migration**

```bash
dotnet ef migrations add AddSponsorshipFields --project src/DiamantLaan.Api
```

Run from repo root. Expected: Migration files generated.

- [ ] **Step 2: Verify migration SQL looks correct**

Read the generated Up() method in the new migration file. It should add `SponsorshipType` (INT, default 0) and `IsPublicSquare` (INT/bool, default 0) columns to the `Squares` table.

- [ ] **Step 3: Verify build**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```

Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Api/Migrations/
git commit -m "feat: add sponsorship migration"
```

---

### Task 3: Update seed data for sponsorship

**Files:**
- Modify: `src/DiamantLaan.Api/Data/AppDbContext.cs`

- [ ] **Step 1: Update Square seeding in AppDbContext.SeedAsync**

Replace the square seeding block (lines 67-76) in `src/DiamantLaan.Api/Data/AppDbContext.cs`:

```csharp
if (!db.Squares.Any())
{
    var squares = new List<Square>();
    for (int i = 1; i <= 4200; i++)
    {
        var sponsorshipType = SponsorshipType.None;
        var isPublic = false;
        if (i >= 1 && i <= 1000)
        {
            sponsorshipType = SponsorshipType.OraniaOntwikkelingsMaatskapy;
        }
        else if (i >= 1001 && i <= 2000)
        {
            sponsorshipType = SponsorshipType.OraniaDorpstraad;
        }
        else if (i >= 2001 && i <= 4200)
        {
            isPublic = true;
        }

        squares.Add(new Square
        {
            Id = i,
            Status = SquareStatus.NogNieBeginNie,
            SponsorshipType = sponsorshipType,
            IsPublicSquare = isPublic
        });
    }
    db.Squares.AddRange(squares);
    await db.SaveChangesAsync();
}
```

- [ ] **Step 2: Verify build**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```
Expected: Build succeeded.

- [ ] **Step 3: Commit**

```bash
git add src/DiamantLaan.Api/Data/AppDbContext.cs
git commit -m "feat: seed squares with sponsorship designations"
```

---

### Task 4: Update SquareDto and RoadController to return sponsorship fields

**Files:**
- Modify: `src/DiamantLaan.Api/Models/Dtos/SquareDto.cs`
- Modify: `src/DiamantLaan.Api/Controllers/RoadController.cs`

- [ ] **Step 1: Update SquareDto**

Replace `src/DiamantLaan.Api/Models/Dtos/SquareDto.cs`:

```csharp
using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models.Dtos;

public class SquareDto
{
    public int Id { get; set; }
    public SquareStatus Status { get; set; }
    public bool IsSold { get; set; }
    public SponsorshipType SponsorshipType { get; set; }
    public bool IsPublicSquare { get; set; }
}
```

- [ ] **Step 2: Update RoadController.GetSquares to include new fields**

Replace the `Select` in `GetSquares()` (line 22) in `src/DiamantLaan.Api/Controllers/RoadController.cs`:

```csharp
.Select(s => new SquareDto
{
    Id = s.Id,
    Status = s.Status,
    IsSold = s.OwnerId != null,
    SponsorshipType = s.SponsorshipType,
    IsPublicSquare = s.IsPublicSquare
})
```

- [ ] **Step 3: Verify build**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Api/Models/Dtos/SquareDto.cs src/DiamantLaan.Api/Controllers/RoadController.cs
git commit -m "feat: return sponsorship fields in SquareDto"
```

---

### Task 5: Update frontend Square model and coordinate-config props

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/models/square.ts`
- Modify: `src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts`

- [ ] **Step 1: Update TypeScript Square model**

Replace `src/DiamantLaan.Web/src/app/models/square.ts`:

```typescript
export enum SquareStatus {
  NogNieBeginNie = 0,
  Voorberei = 1,
  BesigOmTeTeer = 2,
  KlaarGeteer = 3
}

export enum SponsorshipType {
  None = 0,
  OraniaOntwikkelingsMaatskapy = 1,
  OraniaDorpstraad = 2
}

export interface Square {
  id: number;
  status: SquareStatus;
  isSold?: boolean;
  sponsorshipType: SponsorshipType;
  isPublicSquare: boolean;
}

export const STATUS_LABELS: Record<SquareStatus, string> = {
  [SquareStatus.NogNieBeginNie]: 'Nog nie begin nie',
  [SquareStatus.Voorberei]: 'Voorberei',
  [SquareStatus.BesigOmTeTeer]: 'Besig om te teer',
  [SquareStatus.KlaarGeteer]: 'Klaar geteer'
};

export const SPONSOR_LABELS: Record<SponsorshipType, string> = {
  [SponsorshipType.None]: '',
  [SponsorshipType.OraniaOntwikkelingsMaatskapy]: 'Borg: Orania Ontwikkelings Maatskapy',
  [SponsorshipType.OraniaDorpstraad]: 'Borg: Orania Dorpstraad'
};
```

- [ ] **Step 2: Pass sponsorship props through coordinate-config.ts**

In `src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts`, in the `features.push` block (lines 135-152), update the `properties` object:

```typescript
properties: {
  id: sqId,
  status: sq?.status ?? 0,
  isSold: sq?.isSold ?? false,
  sponsorshipType: sq?.sponsorshipType ?? 0,
  isPublicSquare: sq?.isPublicSquare ?? false,
},
```

- [ ] **Step 3: Verify build**

```bash
npm run build --prefix src/DiamantLaan.Web
```
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Web/src/app/models/square.ts src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts
git commit -m "feat: add sponsorship fields to frontend Square model and GeoJSON props"
```

---

### Task 6: Sponsor styling in road-map component

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.ts`

- [ ] **Step 1: Add sponsor color constants and import SponsorshipType/SPONSOR_LABELS**

Update the imports and constants (lines 1-6) in `src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.ts`:

```typescript
import { Square, SquareStatus, STATUS_LABELS, SponsorshipType, SPONSOR_LABELS } from '../../../models/square';
```

Add sponsor colors after `SOLD_COLOR` (line 13):

```typescript
const SOLD_COLOR = '#C67B5C';
const SELECTED_COLOR = '#3D2B1F';
const SPONSOR_FILL = '#D4A843';
const DRAG_THRESHOLD = 5;
```

- [ ] **Step 2: Update style function to use sponsor colors**

In the `refreshLayer()` method, update the `setStyle` callback (lines 193-223). Replace the style block with:

```typescript
this.geoLayer.setStyle((feature) => {
  const props = feature?.properties;
  const id = props?.['id'] as number;
  const status = (props?.['status'] as number) ?? SquareStatus.NogNieBeginNie;
  const isSold = props?.['isSold'] as boolean;
  const sponsorshipType = (props?.['sponsorshipType'] as number) ?? SponsorshipType.None;

  let fillColor = STATUS_COLORS[status] ?? STATUS_COLORS[SquareStatus.NogNieBeginNie];
  let fillOpacity = 0.85;
  let strokeColor = '#fff';
  let strokeWeight = 0.5;

  if (status === SquareStatus.NogNieBeginNie && isSold) {
    fillColor = SOLD_COLOR;
  } else if (!isSold && sponsorshipType !== SponsorshipType.None) {
    fillColor = SPONSOR_FILL;
  }

  if (this.selectedIds.includes(id)) {
    strokeColor = SELECTED_COLOR;
    strokeWeight = 2;
  }

  if (this.statusFilter !== null && status !== this.statusFilter) {
    fillOpacity = 0.15;
  }

  return {
    fillColor,
    fillOpacity,
    color: strokeColor,
    weight: strokeWeight,
  };
});
```

- [ ] **Step 3: Update tooltip to show sponsor label**

In the `mouseover` event handler (lines 234-253), update the tooltip logic:

```typescript
this.geoLayer.on('mouseover', (e: L.LeafletMouseEvent) => {
  if (this.isDragging) return;
  const layer = (e as any).layer;
  const props = layer?.feature?.properties;
  const id = props?.id as number;
  const status = props?.status as number;
  const isSold = props?.isSold as boolean;
  const sponsorshipType = (props?.sponsorshipType as number) ?? SponsorshipType.None;
  if (id == null) return;

  let label: string;
  if (status === SquareStatus.NogNieBeginNie && isSold) {
    label = 'Verkoop';
  } else if (sponsorshipType !== SponsorshipType.None) {
    const sponsorName = SPONSOR_LABELS[sponsorshipType as SponsorshipType];
    label = sponsorName + ' \u2014 Dra ook by';
  } else {
    label = STATUS_LABELS[status as SquareStatus] ?? 'Onbekend';
  }
  layer.bindTooltip(`Blok #${id} \u2014 ${label}`, {
    direction: 'top',
    offset: [0, -4],
  }).openTooltip();
});
```

- [ ] **Step 4: Verify build**

```bash
npm run build --prefix src/DiamantLaan.Web
```
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.ts
git commit -m "feat: add sponsor gold color and tooltip for sponsor squares"
```

---

### Task 7: Remove status gate on purchases (backend)

**Files:**
- Modify: `src/DiamantLaan.Api/Controllers/PurchaseController.cs`

- [ ] **Step 1: Remove the status check**

In `src/DiamantLaan.Api/Controllers/PurchaseController.cs`, remove lines 36-37 (the `if` block that checks `s.Status != SquareStatus.NogNieBeginNie`).

Delete this block entirely:
```csharp
if (squares.Any(s => s.Status != SquareStatus.NogNieBeginNie))
    return BadRequest(new { message = "Kan slegs blokke koop wat nog nie begin is nie." });
```

The method should now only check `OwnerId != null` (lines 33-34 kept) and then proceed.

- [ ] **Step 2: Also remove unused import**

Remove the unused `using DiamantLaan.Api.Models.Enums;` import (line 5) if `SquareStatus` is no longer referenced in the file. Check — the `SquareStatus` import is only used by the removed check, so remove it.

- [ ] **Step 3: Verify build**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Api/Controllers/PurchaseController.cs
git commit -m "feat: allow purchasing squares at any construction status"
```

---

### Task 8: Remove status filter from map component (frontend)

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/components/map/map.component.ts`

- [ ] **Step 1: Remove status filter from toggleSquare()**

In `src/DiamantLaan.Web/src/app/components/map/map.component.ts`, remove line 233:
```typescript
if (sq.status !== SquareStatus.NogNieBeginNie) return;
```

- [ ] **Step 2: Remove status filter from selectRange()**

Remove line 257:
```typescript
if (sq.status !== SquareStatus.NogNieBeginNie) continue;
```

- [ ] **Step 3: Clean up unused import if needed**

`SquareStatus` is still used in the legend CSS classes (line 22) so keep the import.

- [ ] **Step 4: Verify build**

```bash
npm run build --prefix src/DiamantLaan.Web
```
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add src/DiamantLaan.Web/src/app/components/map/map.component.ts
git commit -m "feat: remove status filter from map square selection"
```

---

### Task 9: Add IsOraniaResident to User model + migration

**Files:**
- Modify: `src/DiamantLaan.Api/Models/User.cs`

- [ ] **Step 1: Add IsOraniaResident property**

In `src/DiamantLaan.Api/Models/User.cs`, add after `LastName`:

```csharp
using Microsoft.AspNetCore.Identity;

namespace DiamantLaan.Api.Models;

public class User : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsOraniaResident { get; set; }
    public ICollection<Square> Squares { get; set; } = new List<Square>();
    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}
```

- [ ] **Step 2: Create migration**

```bash
dotnet ef migrations add AddIsOraniaResident --project src/DiamantLaan.Api
```
Expected: Migration files generated with a new `IsOraniaResident` column on `AspNetUsers`.

- [ ] **Step 3: Verify build**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Api/Models/User.cs src/DiamantLaan.Api/Migrations/
git commit -m "feat: add IsOraniaResident to User model"
```

---

### Task 10: Update RegisterDto and AuthController

**Files:**
- Modify: `src/DiamantLaan.Api/Models/Dtos/RegisterDto.cs`
- Modify: `src/DiamantLaan.Api/Controllers/AuthController.cs`

- [ ] **Step 1: Update RegisterDto**

Replace `src/DiamantLaan.Api/Models/Dtos/RegisterDto.cs`:

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
    public string? PhoneNumber { get; set; }
    public bool IsOraniaResident { get; set; }
}
```

- [ ] **Step 2: Update AuthController.Register to store new fields**

In `src/DiamantLaan.Api/Controllers/AuthController.cs`, update the user creation block (lines 28-34):

```csharp
var user = new User
{
    UserName = dto.Email,
    Email = dto.Email,
    FirstName = dto.FirstName,
    LastName = dto.LastName,
    PhoneNumber = dto.PhoneNumber,
    IsOraniaResident = dto.IsOraniaResident
};
```

- [ ] **Step 3: Add IsOraniaResident to JWT claims**

In the `GenerateJwtToken` method (lines 60-87), add after the Surname claim (line 70):

```csharp
new(ClaimTypes.GivenName, user.FirstName),
new(ClaimTypes.Surname, user.LastName),
new("IsOraniaResident", user.IsOraniaResident ? "true" : "false"),
```

Also add `PhoneNumber` to the claims:

```csharp
new("PhoneNumber", user.PhoneNumber ?? ""),
```

And add `IsOraniaResident` to the login response (line 57). Update the login OK response to include the resident field:

```csharp
return Ok(new { token, user.Email, user.FirstName, user.LastName, user.PhoneNumber, user.IsOraniaResident, roles });
```

And update the register OK response (line 45):

```csharp
return Ok(new { token, user.Email, user.FirstName, user.LastName, user.PhoneNumber, user.IsOraniaResident });
```

- [ ] **Step 4: Verify build**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add src/DiamantLaan.Api/Models/Dtos/RegisterDto.cs src/DiamantLaan.Api/Controllers/AuthController.cs
git commit -m "feat: accept and store phone number and resident status on registration"
```

---

### Task 11: Update frontend auth models and register component

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/models/user.ts`
- Modify: `src/DiamantLaan.Web/src/app/services/auth.service.ts`
- Modify: `src/DiamantLaan.Web/src/app/components/register/register.component.ts`

- [ ] **Step 1: Update AuthResponse interface**

Replace `src/DiamantLaan.Web/src/app/models/user.ts`:

```typescript
export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isOraniaResident?: boolean;
  roles?: string[];
}
```

- [ ] **Step 2: Update AuthService.register() signature**

In `src/DiamantLaan.Web/src/app/services/auth.service.ts`, replace the `register` method (line 14-17):

```typescript
register(firstName: string, lastName: string, email: string, password: string, phoneNumber: string, isOraniaResident: boolean) {
  return this.http.post<AuthResponse>(`${this.base}/register`, { firstName, lastName, email, password, phoneNumber, isOraniaResident })
    .pipe(tap(res => this.setSession(res)));
}
```

- [ ] **Step 3: Update RegisterComponent template — add phone and resident fields**

In `src/DiamantLaan.Web/src/app/components/register/register.component.ts`, add the new form fields in the template (after the password field block, before the error alert):

```html
<div class="form-group">
  <label>Foon Nommer</label>
  <input type="tel" [(ngModel)]="phoneNumber" name="phoneNumber" placeholder="082 123 4567">
</div>
<div class="form-group checkbox-group">
  <label class="checkbox-label">
    <input type="checkbox" [(ngModel)]="isOraniaResident" name="isOraniaResident">
    Inwoner van Orania?
  </label>
</div>
```

- [ ] **Step 4: Add class properties for new fields**

In the RegisterComponent class, add after `password`:

```typescript
phoneNumber = '';
isOraniaResident = false;
```

- [ ] **Step 5: Update submit() to pass new fields**

Replace the `submit()` method:

```typescript
submit() {
  this.error = '';
  this.loading = true;
  this.auth.register(
    this.firstName, this.lastName, this.email, this.password,
    this.phoneNumber, this.isOraniaResident
  ).subscribe({
    next: () => this.router.navigate(['/kaart']),
    error: (err) => { this.error = err.error?.message || 'Registrasie het misluk.'; this.loading = false; }
  });
}
```

- [ ] **Step 6: Add checkbox styling**

Add to the styles array after the existing `.error-alert` block:

```css
.checkbox-group { margin-bottom: 1rem; }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text);
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: var(--color-terracotta);
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build --prefix src/DiamantLaan.Web
```
Expected: Build succeeded.

- [ ] **Step 8: Commit**

```bash
git add src/DiamantLaan.Web/src/app/models/user.ts src/DiamantLaan.Web/src/app/services/auth.service.ts src/DiamantLaan.Web/src/app/components/register/register.component.ts
git commit -m "feat: add phone number and resident status to registration form"
```

---

### Task 12: Fix curve overlap in coordinate-config.ts

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts`

- [ ] **Step 1: Add curvature-aware longitudinal spacing**

The current code computes `polyDist` identically for all 6 width positions at the same roadPos. At curves, outer lanes need more arc length than inner lanes.

Add these helper functions before `generateSquareGeoJson`:

```typescript
/** Estimate radius of curvature at a given distance along path. */
function curvatureRadiusAtDistance(wps: Waypoint[], cumDists: number[], distance: number): number {
  const step = 0.5;
  const d1 = Math.max(0, distance - step);
  const d2 = Math.min(cumDists[cumDists.length - 1], distance + step);
  const θ1 = bearingAtDistance(wps, cumDists, d1);
  const θ2 = bearingAtDistance(wps, cumDists, d2);
  let Δθ = Math.abs(θ2 - θ1);
  if (Δθ > 180) Δθ = 360 - Δθ;
  if (Δθ < 0.001) return Infinity;
  const Δs = d2 - d1;
  return (Δs / (Δθ * TO_RAD));
}

/** Adjusted longitudinal position for a given lane offset from centerline. */
function adjustedPolyDist(
  roadPos: number, widthIdx: number, totalDist: number,
  wps: Waypoint[], cumDists: number[]
): number {
  const basePolyDist = (roadPos / (ROAD_LENGTH_M - 1)) * totalDist;
  const R = curvatureRadiusAtDistance(wps, cumDists, basePolyDist);
  if (!isFinite(R)) return basePolyDist;
  const laneOffset = widthIdx - (ROAD_WIDTH - 1) / 2;
  const factor = (R + laneOffset) / R;
  return basePolyDist * factor;
}
```

- [ ] **Step 2: Use adjustedPolyDist in the main loop**

In the `generateSquareGeoJson` function, replace line 111:

```typescript
// Before:
const polyDist = (roadPos / (ROAD_LENGTH_M - 1)) * totalDist;

// After:
const polyDist = adjustedPolyDist(roadPos, widthIdx, totalDist, wps, cumDists);
```

- [ ] **Step 3: Verify build**

```bash
npm run build --prefix src/DiamantLaan.Web
```
Expected: Build succeeded.

- [ ] **Step 4: Verify — start dev server and inspect map**

```bash
npm start --prefix src/DiamantLaan.Web &
sleep 5
echo "Open browser to check curves for overlap"
```

Visually confirm squares at the 90° turn (segment 1→2 area) and the kink (segment 4 area) no longer overlap.

- [ ] **Step 5: Commit**

```bash
git add src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts
git commit -m "feat: arc-length-adjusted spacing to fix square overlap at curves"
```

---

### Task 13: Create admin daily-sales and buyers endpoints

**Files:**
- Create: `src/DiamantLaan.Api/Models/Dtos/DailySalesDto.cs`
- Create: `src/DiamantLaan.Api/Models/Dtos/BuyerDto.cs`
- Modify: `src/DiamantLaan.Api/Controllers/AdminController.cs`

- [ ] **Step 1: Create DailySalesDto**

Write to `src/DiamantLaan.Api/Models/Dtos/DailySalesDto.cs`:

```csharp
namespace DiamantLaan.Api.Models.Dtos;

public class DailySalesDto
{
    public string Date { get; set; } = string.Empty;
    public double Revenue { get; set; }
    public int PurchaseCount { get; set; }
}
```

- [ ] **Step 2: Create BuyerDto**

Write to `src/DiamantLaan.Api/Models/Dtos/BuyerDto.cs`:

```csharp
namespace DiamantLaan.Api.Models.Dtos;

public class BuyerDto
{
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsOraniaResident { get; set; }
    public int SquareCount { get; set; }
    public double TotalSpent { get; set; }
}
```

- [ ] **Step 3: Add GET /api/admin/daily-sales endpoint**

In `src/DiamantLaan.Api/Controllers/AdminController.cs`, add after the `GetStats` method:

```csharp
[HttpGet("daily-sales")]
public async Task<IActionResult> GetDailySales()
{
    var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30).Date;
    var dailySales = await _db.Purchases
        .Where(p => p.PurchaseDate >= thirtyDaysAgo)
        .GroupBy(p => p.PurchaseDate.Date)
        .Select(g => new DailySalesDto
        {
            Date = g.Key.ToString("yyyy-MM-dd"),
            Revenue = g.Sum(p => (double)p.Amount),
            PurchaseCount = g.Count()
        })
        .OrderBy(d => d.Date)
        .ToListAsync();

    return Ok(dailySales);
}
```

- [ ] **Step 4: Add GET /api/admin/buyers endpoint with CSV support**

In `src/DiamantLaan.Api/Controllers/AdminController.cs`, add after the daily-sales endpoint:

```csharp
[HttpGet("buyers")]
public async Task<IActionResult> GetBuyers([FromQuery] string? format)
{
    var buyers = await _db.Users
        .Where(u => u.Purchases.Any())
        .Select(u => new BuyerDto
        {
            UserId = u.Id,
            Name = u.FirstName + " " + u.LastName,
            Email = u.Email!,
            PhoneNumber = u.PhoneNumber,
            IsOraniaResident = u.IsOraniaResident,
            SquareCount = u.Purchases.Sum(p => p.PurchaseSquares.Count),
            TotalSpent = (double)u.Purchases.Sum(p => p.Amount)
        })
        .OrderByDescending(b => b.TotalSpent)
        .ToListAsync();

    if (format == "csv")
    {
        var csv = "Naam,E-pos,Foon Nommer,Inwoner,Blokke,Totaal Bestee\n" +
                   string.Join("\n", buyers.Select(b =>
                       $"\"{b.Name}\",\"{b.Email}\",\"{b.PhoneNumber ?? ""}\",{(b.IsOraniaResident ? "Ja" : "Nee")},{b.SquareCount},R{b.TotalSpent:F2}"));
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "kopers.csv");
    }

    return Ok(buyers);
}
```

- [ ] **Step 5: Add required using statements**

At the top of AdminController.cs, ensure these imports exist:

```csharp
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
```

The existing imports should cover it. Add `using System.Text;` for the CSV encoding.

- [ ] **Step 6: Verify build**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```
Expected: Build succeeded.

- [ ] **Step 7: Commit**

```bash
git add src/DiamantLaan.Api/Models/Dtos/DailySalesDto.cs src/DiamantLaan.Api/Models/Dtos/BuyerDto.cs src/DiamantLaan.Api/Controllers/AdminController.cs
git commit -m "feat: add admin daily-sales and buyers endpoints with CSV export"
```

---

### Task 14: Enhance admin stats endpoint with sponsor vs public breakdown

**Files:**
- Modify: `src/DiamantLaan.Api/Controllers/AdminController.cs`

- [ ] **Step 1: Enhance GetStats to include sponsor/public breakdown**

Replace the existing `GetStats` method (lines 66-87) in `src/DiamantLaan.Api/Controllers/AdminController.cs`:

```csharp
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

    var totalRaised = await _db.Purchases.SumAsync(p => (double)p.Amount);

    var sponsorSquaresSold = await _db.Squares.CountAsync(s => s.OwnerId != null && s.SponsorshipType != SponsorshipType.None);
    var publicSquaresSold = await _db.Squares.CountAsync(s => s.OwnerId != null && s.SponsorshipType == SponsorshipType.None);

    var sponsorRevenue = await _db.PurchaseSquares
        .Where(ps => ps.Square.SponsorshipType != SponsorshipType.None)
        .SumAsync(ps => (double?)ps.Purchase.Amount / ps.Purchase.PurchaseSquares.Count) ?? 0;
    var publicRevenue = totalRaised - sponsorRevenue;

    return Ok(new
    {
        totalSquares = total,
        progress,
        totalRaised,
        sponsorSquaresSold,
        publicSquaresSold,
        sponsorRevenue = Math.Round(sponsorRevenue, 2),
        publicRevenue = Math.Round(publicRevenue, 2),
        perStatus
    });
}
```

- [ ] **Step 2: Verify build**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```
Expected: Build succeeded.

- [ ] **Step 3: Commit**

```bash
git add src/DiamantLaan.Api/Controllers/AdminController.cs
git commit -m "feat: enhance admin stats with sponsor vs public breakdown"
```

---

### Task 15: Install Chart.js and create admin-stats component

**Files:**
- Modify: `src/DiamantLaan.Web/package.json`
- Create: `src/DiamantLaan.Web/src/app/components/admin/admin-stats.component.ts`
- Modify: `src/DiamantLaan.Web/src/app/services/admin.service.ts`
- Modify: `src/DiamantLaan.Web/src/app/app.config.ts` (if ng2-charts needs provider registration)

- [ ] **Step 1: Install chart.js and ng2-charts**

```bash
npm install --save chart.js ng2-charts --prefix src/DiamantLaan.Web
```
Expected: Dependencies added to package.json and node_modules.

- [ ] **Step 2: Update AdminService with new API methods**

Replace `src/DiamantLaan.Web/src/app/services/admin.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SquareStatus } from '../models/square';

export interface DailySales {
  date: string;
  revenue: number;
  purchaseCount: number;
}

export interface Buyer {
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  isOraniaResident: boolean;
  squareCount: number;
  totalSpent: number;
}

export interface AdminStats {
  totalSquares: number;
  progress: number;
  totalRaised: number;
  sponsorSquaresSold: number;
  publicSquaresSold: number;
  sponsorRevenue: number;
  publicRevenue: number;
  perStatus: { status: number; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  updateStatus(squareIds: number[], status: SquareStatus) {
    return this.http.put<any>('/api/admin/squares/status', {
      squareIds,
      status: Number(status)
    });
  }

  getPurchases() {
    return this.http.get<any[]>('/api/admin/purchases');
  }

  getStats() {
    return this.http.get<AdminStats>('/api/admin/stats');
  }

  getDailySales() {
    return this.http.get<DailySales[]>('/api/admin/daily-sales');
  }

  getBuyers() {
    return this.http.get<Buyer[]>('/api/admin/buyers');
  }

  getBuyersCsvUrl(): string {
    return '/api/admin/buyers?format=csv';
  }
}
```

- [ ] **Step 3: Create AdminStatsComponent**

Write to `src/DiamantLaan.Web/src/app/components/admin/admin-stats.component.ts`:

```typescript
import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { AdminService, AdminStats, DailySales, Buyer } from '../../services/admin.service';
import { STATUS_LABELS, SquareStatus } from '../../models/square';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  template: `
    <div class="container stats-page">
      <div class="page-header">
        <h2>Statistiek Paneel</h2>
        <a [href]="csvUrl" class="btn btn-outline">Laai Af as CSV</a>
      </div>

      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">R{{ stats.totalRaised | number:'1.0-0' }}</div>
          <div class="stat-label">Totaal Ingesamel</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.progress }}<small>%</small></div>
          <div class="stat-label">Gefinansier</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.sponsorSquaresSold + stats.publicSquaresSold }}</div>
          <div class="stat-label">Verkoopte Blokke</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">R{{ stats.sponsorRevenue | number:'1.0-0' }}</div>
          <div class="stat-label">Borg Inkomste</div>
        </div>
      </div>

      <div class="chart-row">
        <div class="chart-card chart-wide">
          <h3>Daaglikse Verkope</h3>
          <canvas baseChart
            [data]="dailySalesChartData"
            [type]="'bar'"
            [options]="barChartOptions">
          </canvas>
        </div>
        <div class="chart-card">
          <h3>Blok Status</h3>
          <canvas baseChart
            [data]="statusChartData"
            [type]="'doughnut'"
            [options]="doughnutOptions">
          </canvas>
        </div>
      </div>

      <div class="chart-row">
        <div class="chart-card">
          <h3>Borg vs Publiek Verkope</h3>
          <canvas baseChart
            [data]="sponsorVsPublicData"
            [type]="'pie'"
            [options]="pieOptions">
          </canvas>
        </div>
        <div class="chart-card">
          <h3>Inkomste Progressie</h3>
          <div class="progress-section">
            <div class="progress-label">Borg R2,000,000 + Publiek R{{ stats.totalRaised | number:'1.0-0' }}</div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width]="revenueProgressPercent() + '%'"></div>
            </div>
            <div class="progress-target">Teiken: R4,200,000</div>
          </div>
        </div>
      </div>

      <div class="buyer-table-section">
        <h3>Koper Besonderhede</h3>
        <div class="table-controls">
          <input type="text" [(ngModel)]="searchText" placeholder="Soek kopers..." class="search-input">
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th (click)="sortBy('name')">Naam {{ sortHeader('name') }}</th>
                <th (click)="sortBy('email')">E-pos {{ sortHeader('email') }}</th>
                <th (click)="sortBy('phoneNumber')">Foon {{ sortHeader('phoneNumber') }}</th>
                <th (click)="sortBy('isOraniaResident')">Inwoner {{ sortHeader('isOraniaResident') }}</th>
                <th (click)="sortBy('squareCount')">Blokke {{ sortHeader('squareCount') }}</th>
                <th (click)="sortBy('totalSpent')">Bestee {{ sortHeader('totalSpent') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (b of filteredBuyers(); track b.userId) {
                <tr>
                  <td>{{ b.name }}</td>
                  <td>{{ b.email }}</td>
                  <td>{{ b.phoneNumber || '-' }}</td>
                  <td>{{ b.isOraniaResident ? 'Ja' : 'Nee' }}</td>
                  <td>{{ b.squareCount }}</td>
                  <td>R{{ b.totalSpent | number:'1.0-0' }}</td>
                </tr>
              }
              @if (filteredBuyers().length === 0) {
                <tr><td colspan="6" class="empty">Geen kopers gevind nie.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-page { padding: 2rem 1.5rem 4rem; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .page-header h2 {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      color: var(--color-text);
    }
    .stats-cards {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      flex: 1;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      text-align: center;
      box-shadow: var(--shadow-sm);
    }
    .stat-value {
      font-family: var(--font-heading);
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .stat-value small {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-muted);
    }
    .stat-label {
      font-family: var(--font-heading);
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 0.125rem;
    }
    .chart-row {
      display: flex;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .chart-card {
      flex: 1;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
    }
    .chart-wide { flex: 2; }
    .chart-card h3 {
      font-family: var(--font-heading);
      font-size: 0.9375rem;
      color: var(--color-text);
      margin-bottom: 1rem;
    }
    .progress-section { text-align: center; padding: 1rem 0; }
    .progress-label {
      font-size: 0.8125rem;
      color: var(--color-muted);
      margin-bottom: 0.75rem;
    }
    .progress-bar {
      height: 1.25rem;
      background: var(--color-cream);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--color-terracotta);
      border-radius: var(--radius-sm);
      transition: width 0.5s ease;
    }
    .progress-target {
      font-size: 0.75rem;
      color: var(--color-muted);
      margin-top: 0.5rem;
    }
    .buyer-table-section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
    }
    .buyer-table-section h3 {
      font-family: var(--font-heading);
      font-size: 0.9375rem;
      color: var(--color-text);
      margin-bottom: 1rem;
    }
    .table-controls { margin-bottom: 0.75rem; }
    .search-input {
      width: 100%;
      max-width: 320px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      font-family: var(--font-body);
      background: var(--color-cream);
      color: var(--color-text);
    }
    .table-wrap { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
    th {
      text-align: left;
      padding: 0.625rem 0.75rem;
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-muted);
      border-bottom: 2px solid var(--color-border);
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
    }
    th:hover { color: var(--color-terracotta); }
    td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--color-border-light);
      color: var(--color-text);
      white-space: nowrap;
    }
    tr:hover td { background: var(--color-cream); }
    .empty { text-align: center; color: var(--color-muted); padding: 2rem; }
    @media (max-width: 768px) {
      .stats-cards { flex-wrap: wrap; }
      .stat-card { min-width: 140px; }
      .chart-row { flex-direction: column; }
    }
  `]
})
export class AdminStatsComponent implements OnInit {
  private admin = inject(AdminService);

  stats: AdminStats = {
    totalSquares: 0, progress: 0, totalRaised: 0,
    sponsorSquaresSold: 0, publicSquaresSold: 0,
    sponsorRevenue: 0, publicRevenue: 0,
    perStatus: []
  };

  dailySales: DailySales[] = [];
  buyers: Buyer[] = [];
  searchText = '';
  sortField = 'totalSpent';
  sortAsc = false;
  csvUrl = this.admin.getBuyersCsvUrl();

  dailySalesChartData: any = { labels: [], datasets: [] };
  statusChartData: any = { labels: [], datasets: [] };
  sponsorVsPublicData: any = { labels: [], datasets: [] };

  barChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v: any) => 'R' + v } }
    }
  };
  doughnutOptions: any = { responsive: true, maintainAspectRatio: false };
  pieOptions: any = { responsive: true, maintainAspectRatio: false };

  ngOnInit() {
    this.admin.getStats().subscribe(s => {
      this.stats = s;
      this.buildStatusChart();
      this.buildSponsorVsPublicChart();
    });
    this.admin.getDailySales().subscribe(d => {
      this.dailySales = d;
      this.buildDailySalesChart();
    });
    this.admin.getBuyers().subscribe(b => this.buyers = b);
  }

  private buildDailySalesChart() {
    this.dailySalesChartData = {
      labels: this.dailySales.map(d => d.date.slice(5)),
      datasets: [
        {
          data: this.dailySales.map(d => d.revenue),
          label: 'Inkomste',
          backgroundColor: '#C67B5C',
          borderRadius: 4,
        },
        {
          type: 'line',
          data: this.cumulative(this.dailySales.map(d => d.revenue)),
          label: 'Kumulatief',
          borderColor: '#3D2B1F',
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 0,
        }
      ]
    };
  }

  private cumulative(values: number[]): number[] {
    let sum = 0;
    return values.map(v => sum += v);
  }

  private buildStatusChart() {
    this.statusChartData = {
      labels: this.stats.perStatus.map(s => STATUS_LABELS[s.status as SquareStatus]),
      datasets: [{
        data: this.stats.perStatus.map(s => s.count),
        backgroundColor: ['#D4C4A8', '#B5651D', '#8B7355', '#6B7B3C'],
      }]
    };
  }

  private buildSponsorVsPublicChart() {
    this.sponsorVsPublicData = {
      labels: ['Borg Blokke', 'Publieke Blokke'],
      datasets: [{
        data: [this.stats.sponsorSquaresSold, this.stats.publicSquaresSold],
        backgroundColor: ['#D4A843', '#C67B5C'],
      }]
    };
  }

  revenueProgressPercent(): number {
    const total = this.stats.totalRaised + 2000000;
    return Math.min(100, (total / 4200000) * 100);
  }

  filteredBuyers(): Buyer[] {
    let filtered = this.buyers;
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        (b.phoneNumber || '').includes(q)
      );
    }
    return filtered.sort((a: any, b: any) => {
      const va = a[this.sortField];
      const vb = b[this.sortField];
      if (typeof va === 'string') return this.sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return this.sortAsc ? va - vb : vb - va;
    });
  }

  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = false;
    }
  }

  sortHeader(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortAsc ? '\u25B2' : '\u25BC';
  }
}
```

- [ ] **Step 4: Register ng2-charts provider in app.config.ts**

In `src/DiamantLaan.Web/src/app/app.config.ts`, add the import and provider:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables()),
  ]
};
```

- [ ] **Step 5: Verify build**

```bash
npm run build --prefix src/DiamantLaan.Web
```
Expected: Build succeeded. Fix any type errors.

- [ ] **Step 6: Commit**

```bash
git add src/DiamantLaan.Web/package.json src/DiamantLaan.Web/package-lock.json src/DiamantLaan.Web/src/app/services/admin.service.ts src/DiamantLaan.Web/src/app/components/admin/admin-stats.component.ts
git commit -m "feat: install Chart.js and create admin stats dashboard component"
```

---

### Task 16: Add admin-stats route and navbar link

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/app.routes.ts`
- Modify: `src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts`

- [ ] **Step 1: Add route for /admin/stats**

In `src/DiamantLaan.Web/src/app/app.routes.ts`, add after the `/admin` route (line 12):

```typescript
{ path: 'admin/stats', loadComponent: () => import('./components/admin/admin-stats.component').then(m => m.AdminStatsComponent), canActivate: [authGuard, adminGuard] },
```

- [ ] **Step 2: Add "Statistiek" link in navbar for admin users**

In `src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts`, add after the Admin link (line 27):

```html
<a routerLink="/admin/stats" (click)="menuOpen.set(false)">Statistiek</a>
```

- [ ] **Step 3: Verify build**

```bash
npm run build --prefix src/DiamantLaan.Web
```
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Web/src/app/app.routes.ts src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts
git commit -m "feat: add admin stats route and navbar link"
```

---

### Task 17: Full system build and smoke test

**Files:** None (verification only)

- [ ] **Step 1: Build backend**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```
Expected: Build succeeded with 0 errors.

- [ ] **Step 2: Build frontend**

```bash
npm run build --prefix src/DiamantLaan.Web
```
Expected: Build succeeded with 0 errors.

- [ ] **Step 3: Apply migrations and run backend**

```bash
dotnet run --project src/DiamantLaan.Api &
```
Wait for startup, then `curl http://localhost:5000/api/road/stats` to verify the API responds.

- [ ] **Step 4: Verify admin login**

```bash
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@diamantlaan.co.za","password":"Admin123!"}'
```
Expected: Returns JWT token + user info.

- [ ] **Step 5: Verify new endpoints work**

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@diamantlaan.co.za","password":"Admin123!"}' | jq -r '.token')
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/stats | jq .
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/daily-sales | jq .
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/buyers | jq .
```
Expected: Each returns valid JSON with expected fields.

- [ ] **Step 6: Verify CSV export**

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/buyers?format=csv
```
Expected: Returns CSV with header row starting "Naam,E-pos,..."

- [ ] **Step 7: Stop the server**

```bash
kill %1
```

- [ ] **Step 8: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "chore: verification fixes"
```
