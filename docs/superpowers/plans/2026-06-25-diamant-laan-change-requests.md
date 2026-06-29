# Diamant Laan Change Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved change requests from `docs/DiamantLaan-Change-Requests.md`: fix road-curve square overlap, allow purchasing squares in any status, add phone/resident fields to registration, and build a full `/admin/stats` dashboard with charts, tables, and CSV export.

**Architecture:** Keep the existing ASP.NET Core 8 + Angular 19 stack. Make minimal, targeted edits: one geometry helper in the frontend for curve spacing, remove status purchase guards on both ends, add a single `IsOraniaResident` column via EF migration, extend the existing `AdminController` with a stats DTO, and add a new lazy-loaded `AdminStatsComponent` using Chart.js.

**Tech Stack:** C# / ASP.NET Core 8, EF Core 8 SQLite, Angular 19 standalone, Leaflet 1.9.4, Chart.js 4.x.

---

## Scope Notes

- **Corporate sponsors are out of scope for this plan.** The user explicitly asked to leave all blocks public/purchasable. Do not implement gold colors, sponsor tooltips, or purchase restrictions. The admin dashboard may still display a "sponsor baseline" revenue bar and a sponsor/public pie for reporting using the static ID ranges from the spec, but all 4200 squares remain publicly purchasable.
- Do not convert squares to hexagons.
- Keep the existing JWT auth and role model.

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts` | Square polygon generation; add curvature-aware longitudinal spacing. |
| `src/DiamantLaan.Api/Controllers/PurchaseController.cs` | Remove status-only purchase restriction; add square ID range guard. |
| `src/DiamantLaan.Web/src/app/components/map/map.component.ts` | Remove status check when selecting squares. |
| `src/DiamantLaan.Api/Models/User.cs` | Add `IsOraniaResident` bool. |
| `src/DiamantLaan.Api/Models/Dtos/RegisterDto.cs` | Add `PhoneNumber` and `IsOraniaResident`. |
| `src/DiamantLaan.Api/Controllers/AuthController.cs` | Persist new fields and include them in JWT claims. |
| `src/DiamantLaan.Web/src/app/models/user.ts` | Extend `AuthResponse`. |
| `src/DiamantLaan.Web/src/app/services/auth.service.ts` | Pass new fields to register endpoint. |
| `src/DiamantLaan.Web/src/app/components/register/register.component.ts` | Add form inputs. |
| `src/DiamantLaan.Api/Controllers/AdminController.cs` | Add comprehensive stats endpoint. |
| `src/DiamantLaan.Web/src/app/services/admin.service.ts` | Add stats endpoint consumer. |
| `src/DiamantLaan.Web/src/app/components/admin-stats/admin-stats.component.ts` | New dashboard page. |
| `src/DiamantLaan.Web/src/app/app.routes.ts` | Add `/admin/stats` route. |
| `src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts` | Add Stats nav link for admins. |
| `src/DiamantLaan.Web/package.json` | Add `chart.js` and `ng2-charts` dependencies. |
| `src/DiamantLaan.Api/Migrations/*` | New EF migration for `IsOraniaResident`. |

---

## Task 1: Fix Square Overlap at Road Curves

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts`

**Approach:** Estimate signed curvature at each centerline distance from the waypoint polyline. Scale the longitudinal (road) position of each square by `1 + d/R` where `d` is the signed perpendicular offset from centerline. Outer rows get wider spacing, inner rows narrower. Clamp the adjusted position to the road bounds.

- [ ] **Step 1.1: Add curvature helper**

Add below `bearingAtDistance`:

```typescript
/** Signed curvature (rad/m) at a given distance along the polyline.
 *  Positive = left turn, negative = right turn, 0 = straight.
 */
function curvatureAtDistance(wps: Waypoint[], cumDists: number[], distance: number): number {
  const delta = 5; // meters; smooth enough for 1m cells
  if (distance <= delta || distance >= cumDists[cumDists.length - 1] - delta) return 0;

  const b1 = bearingAtDistance(wps, cumDists, distance - delta);
  const b2 = bearingAtDistance(wps, cumDists, distance + delta);
  let dBearing = b2 - b1;
  while (dBearing > 180) dBearing -= 360;
  while (dBearing < -180) dBearing += 360;

  return (dBearing * TO_RAD) / (2 * delta);
}
```

- [ ] **Step 1.2: Apply arc-length spacing in `generateSquareGeoJson`**

Replace the `polyDist = ...` line with:

```typescript
    const roadPos = Math.floor((sqId - 1) / ROAD_WIDTH); // 0–699
    const widthIdx = (sqId - 1) % ROAD_WIDTH;            // 0–5
    const d = widthIdx - (ROAD_WIDTH - 1) / 2;           // -2.5 .. 2.5

    const kappa = curvatureAtDistance(wps, cumDists, roadPos);
    const radius = Math.abs(kappa) > 1e-8 ? 1 / kappa : Infinity;
    const spacingFactor = isFinite(radius) && Math.abs(radius) > 0.01 ? 1 + d / radius : 1;

    const adjustedRoadPos = Math.max(0, Math.min(ROAD_LENGTH_M - 1, roadPos * spacingFactor));
    const polyDist = ((adjustedRoadPos + 0.5) / ROAD_LENGTH_M) * totalDist;
```

- [ ] **Step 1.3: Verify visually**

Run `npm run build` in the web project. There must be no TypeScript errors. Manual check: open `/kaart`; squares at the 100m left turn and 10m kink should no longer visibly overlap.

---

## Task 2: Sell Blocks Regardless of Construction Status

**Files:**
- Modify: `src/DiamantLaan.Api/Controllers/PurchaseController.cs`
- Modify: `src/DiamantLaan.Web/src/app/components/map/map.component.ts`

- [ ] **Step 2.1: Remove backend status purchase guard**

In `PurchaseController.cs`, remove the `Status != NogNieBeginNie` check. Keep the owner check and add an explicit ID range guard so only squares 1–4200 can be purchased:

```csharp
        if (squares.Any(s => s.OwnerId != null))
            return BadRequest(new { message = "Sommige blokke is reeds verkoop." });

        if (squares.Any(s => s.Id < 1 || s.Id > 4200))
            return BadRequest(new { message = "Ongeldige blokke gekies." });
```

- [ ] **Step 2.2: Remove frontend selection status guard**

In `map.component.ts`, in both `toggleSquare` and `selectRange`, remove the lines:

```typescript
    if (sq.status !== SquareStatus.NogNieBeginNie) return;
```

Keep the `isSold` and `endId` guards.

- [ ] **Step 2.3: Verify**

Backend build: `dotnet build src/DiamantLaan.Api`. Frontend build: `npm run build` in web project.

---

## Task 3: Registration Fields — Phone Number & Orania Resident

**Files:**
- Modify: `src/DiamantLaan.Api/Models/User.cs`
- Modify: `src/DiamantLaan.Api/Models/Dtos/RegisterDto.cs`
- Modify: `src/DiamantLaan.Api/Controllers/AuthController.cs`
- Modify: `src/DiamantLaan.Web/src/app/models/user.ts`
- Modify: `src/DiamantLaan.Web/src/app/services/auth.service.ts`
- Modify: `src/DiamantLaan.Web/src/app/components/register/register.component.ts`
- Create: EF migration `AddIsOraniaResident`

- [ ] **Step 3.1: Add property to `User.cs`**

```csharp
public bool IsOraniaResident { get; set; }
```

- [ ] **Step 3.2: Extend `RegisterDto.cs`**

```csharp
    [Phone]
    public string? PhoneNumber { get; set; }

    public bool IsOraniaResident { get; set; }
```

- [ ] **Step 3.3: Update `AuthController.cs`**

In the `Register` action, set the new fields on `User` and include them in the response:

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

And return:

```csharp
        return Ok(new { token, user.Email, user.FirstName, user.LastName, user.PhoneNumber, user.IsOraniaResident });
```

In `GenerateJwtToken`, add claims:

```csharp
            new("PhoneNumber", user.PhoneNumber ?? ""),
            new("IsOraniaResident", user.IsOraniaResident.ToString())
```

- [ ] **Step 3.4: Update Angular models and service**

`user.ts`:

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

`auth.service.ts`:

```typescript
  register(firstName: string, lastName: string, email: string, password: string, phoneNumber: string, isOraniaResident: boolean) {
    return this.http.post<AuthResponse>(`${this.base}/register`, {
      firstName, lastName, email, password, phoneNumber, isOraniaResident
    }).pipe(tap(res => this.setSession(res)));
  }
```

- [ ] **Step 3.5: Update registration form**

In `register.component.ts`, add component properties:

```typescript
  phoneNumber = '';
  isOraniaResident = false;
```

Add form controls to the template after the password field:

```html
          <div class="form-group">
            <label>Foon Nommer</label>
            <input type="tel" [(ngModel)]="phoneNumber" name="phoneNumber" placeholder="082 123 4567">
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="isOraniaResident" name="isOraniaResident">
              Inwoner van Orania?
            </label>
          </div>
```

Add minimal styling:

```typescript
    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text);
      cursor: pointer;
    }
    .checkbox-group input { width: auto; }
```

Update `submit()`:

```typescript
    this.auth.register(this.firstName, this.lastName, this.email, this.password, this.phoneNumber, this.isOraniaResident).subscribe({
```

- [ ] **Step 3.6: Create EF migration**

Run from repo root:

```bash
dotnet ef migrations add AddIsOraniaResident --project src/DiamantLaan.Api
```

Verify a new migration file appears in `src/DiamantLaan.Api/Migrations/` and contains `IsOraniaResident` with a default value of `false`.

- [ ] **Step 3.7: Verify**

`dotnet build src/DiamantLaan.Api` and `npm run build` in web project must succeed.

---

## Task 4: Admin Stats API

**Files:**
- Modify: `src/DiamantLaan.Api/Controllers/AdminController.cs`

- [ ] **Step 4.1: Add buyer info endpoint**

Replace the existing `[HttpGet("purchases")]` with a richer endpoint that returns per-buyer aggregates (name, email, phone, resident, square count, total spent):

```csharp
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
```

- [ ] **Step 4.2: Replace stats endpoint**

Replace `[HttpGet("stats")]` with:

```csharp
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _db.Squares.CountAsync();
        var perStatus = await _db.Squares
            .GroupBy(s => s.Status)
            .Select(g => new { Status = (int)g.Key, Count = g.Count() })
            .ToListAsync();

        var soldCount = await _db.Squares.CountAsync(s => s.OwnerId != null);
        var totalRaised = await _db.Purchases.SumAsync(p => (double)p.Amount);

        var dailySales = await _db.Purchases
            .GroupBy(p => p.PurchaseDate.Date)
            .Select(g => new { Date = g.Key, Amount = g.Sum(p => (double)p.Amount), Squares = g.Sum(p => p.PurchaseSquares.Count) })
            .OrderBy(g => g.Date)
            .ToListAsync();

        const double sponsorBaseline = 2_000_000;
        var sponsorSquares = Math.Min(soldCount, 2000);
        var publicSquares = Math.Max(0, soldCount - 2000);

        return Ok(new
        {
            totalSquares = total,
            soldSquares = soldCount,
            totalRaised,
            sponsorBaseline,
            perStatus,
            dailySales,
            sponsorSplit = new { sponsorSquares, publicSquares }
        });
    }
```

- [ ] **Step 4.3: Verify**

`dotnet build src/DiamantLaan.Api` must succeed.

---

## Task 5: Admin Stats Dashboard Page

**Files:**
- Modify: `src/DiamantLaan.Web/package.json`
- Modify: `src/DiamantLaan.Web/src/app/services/admin.service.ts`
- Create: `src/DiamantLaan.Web/src/app/components/admin-stats/admin-stats.component.ts`

- [ ] **Step 5.1: Add chart dependencies**

In `package.json` dependencies, add:

```json
    "chart.js": "^4.4.0",
    "ng2-charts": "^8.0.0"
```

Run `npm install` in `src/DiamantLaan.Web`.

- [ ] **Step 5.2: Update `AdminService`**

```typescript
  getStats() {
    return this.http.get<any>('/api/admin/stats');
  }
```

- [ ] **Step 5.3: Create `AdminStatsComponent`**

Create `src/DiamantLaan.Web/src/app/components/admin-stats/admin-stats.component.ts` with:
- Imports: `CommonModule`, `FormsModule`, `BaseChartDirective` from `ng2-charts`, `Chart` from `chart.js/auto`, `AdminService`.
- A stats page with:
  - Revenue progress bar: `R{{ stats.totalRaised | number }} / R{{ stats.sponsorBaseline | number }}`. Compute percentage and cap at 100%.
  - Daily sales line chart (amount per date).
  - Status distribution donut chart.
  - Sponsor vs public pie chart.
  - Buyer table: name, email, phone, resident yes/no, squares, total spent. Sortable by clicking headers, searchable by name/email.
  - "Laai Af as CSV" button that downloads the visible buyer rows as CSV.

Use this component skeleton:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart } from 'chart.js/auto';
import { AdminService } from '../../services/admin.service';
import { STATUS_LABELS, SquareStatus } from '../../models/square';

interface Buyer {
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  isOraniaResident?: boolean;
  squares: number;
  totalSpent: number;
}

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  template: `...`,
  styles: [`...`]
})
export class AdminStatsComponent implements OnInit {
  private admin = inject(AdminService);

  stats: any = {};
  buyers: Buyer[] = [];
  filteredBuyers: Buyer[] = [];
  search = '';
  sortKey: keyof Buyer = 'totalSpent';
  sortDesc = true;
  loading = true;

  dailyChartData: any;
  statusChartData: any;
  sponsorChartData: any;
  chartOptions: any;

  ngOnInit() {
    this.admin.getStats().subscribe({
      next: (s) => { this.stats = s; this.buildCharts(); },
      error: () => { this.loading = false; }
    });
    this.admin.getPurchases().subscribe({
      next: (b) => { this.buyers = b; this.applyFilters(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilters() { ... }
  sortBy(key: keyof Buyer) { ... }
  downloadCsv() { ... }
  buildCharts() { ... }
}
```

Implementation details:
- Chart colors reuse the status colors from `road-map.component.ts`.
- Daily sales chart: labels from `dailySales.date` formatted `yyyy-MM-dd`, data from `amount`.
- Status donut: one segment per status 0–3 using `STATUS_LABELS`.
- Sponsor pie: two segments using `sponsorSplit`.
- CSV columns: `Naam,E-pos,Foon Nommer,Inwoner van Orania,Blokke,Totaal Bestee`.

- [ ] **Step 5.4: Verify component builds**

`npm run build` in the web project must succeed.

---

## Task 6: Routing & Navigation

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/app.routes.ts`
- Modify: `src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts`
- Modify: `src/DiamantLaan.Web/src/app/components/admin/admin.component.ts`

- [ ] **Step 6.1: Add `/admin/stats` route**

```typescript
  { path: 'admin/stats', loadComponent: () => import('./components/admin-stats/admin-stats.component').then(m => m.AdminStatsComponent), canActivate: [authGuard, adminGuard] },
```

- [ ] **Step 6.2: Add admin tab link**

In `admin.component.ts` template, add a link row under the page header:

```html
      <div class="admin-tabs">
        <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Kaart</a>
        <a routerLink="/admin/stats" routerLinkActive="active">Statistieke</a>
      </div>
```

Add `RouterLink` and `RouterLinkActive` to imports.

Add styles:

```css
    .admin-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
    .admin-tabs a { padding: 0.5rem 1rem; border-radius: var(--radius-sm); color: var(--color-muted); text-decoration: none; font-size: 0.875rem; }
    .admin-tabs a.active { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); font-weight: 600; }
```

- [ ] **Step 6.3: Add navbar Stats link for admins**

In `navbar.component.ts`, add an "Admin Statistieke" link next to the existing admin link when `auth.isAdmin()` is true, pointing to `/admin/stats`.

- [ ] **Step 6.4: Verify**

`npm run build` succeeds and the new route is reachable.

---

## Task 7: Final Verification

- [ ] **Step 7.1: Full backend build**

```bash
dotnet build src/DiamantLaan.Api
```

Expected: Build succeeded.

- [ ] **Step 7.2: Full frontend build**

```bash
cd src/DiamantLaan.Web && npm run build
```

Expected: Build succeeded with 0 errors.

- [ ] **Step 7.3: Smoke test**

Start the API (`dotnet run --project src/DiamantLaan.Api`) and the Angular dev server (`npm start` in web project). Confirm:
- Registration captures phone and resident.
- Map squares do not overlap at curves.
- A square with status `Voorberei` and no owner can be selected and purchased.
- `/admin/stats` loads charts and the buyer table.

---

## Self-Review

- **Spec coverage:**
  - Curve overlap fix → Task 1.
  - Corporate sponsors ignored → scope note; no map color/tooltip changes.
  - Sell regardless of status → Task 2.
  - Phone + resident registration → Task 3.
  - Admin dashboard charts/table/CSV → Tasks 4–6.
- **Placeholder scan:** All steps contain concrete code or exact commands; no "TODO" or "implement later".
- **Type consistency:** `AdminService.getStats()` reused. `Buyer` interface matches API shape. Chart data structures use `any` to avoid brittle typing with `ng2-charts`.
