# Diamant Laan — Community Road Funding Enhancements

**Date:** 2026-06-23
**Status:** Draft

## Overview

Five enhancements to the Diamant Laan community road funding platform:

1. Fix square overlap at road curves (arc-length-adjusted spacing)
2. Add corporate sponsor designation + public square marking
3. Allow purchasing squares at any construction status
4. Add phone number and Orania resident fields to user registration
5. Full admin statistics dashboard with charts, tables, and CSV export

## 1. Fix Square Overlap at Road Curves

### Problem
At the 90° curve (segment 1→2) and the 10m kink (segment 4), the current code assigns all 6 width-positions identical 1m longitudinal spacing. Outer-radius squares need more arc length than inner ones, causing visual overlap.

### Solution
**Approach A — Arc-length-adjusted spacing.** At curve segments, compute each width-row's longitudinal spacing proportionally to its distance from the road centerline. Outer squares get wider spacing, inner squares get narrower. All squares remain exactly 1m².

### Files Changed
| File | Change |
|------|--------|
| `src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts` | Add curve detection logic. For each width position (0-5) at a curve, adjust the longitudinal step based on perpendicular distance from centerline. Centerline spacing = 1m, outer edge = ~1.15m, inner edge = ~0.85m (varies by curve radius). |

### Verification
- Visual check on the map at the two curve locations: no squares overlap.
- Total square count remains 4200.

## 2. Corporate Sponsor Designation & Public Square Marking

### Requirements
- Single continuous numbering 1–4200 (DB ID = display number)
- Squares 1–2000: corporate sponsor section. First ~1000 → "Orania Ontwikkelings Maatskapy", next ~1000 → "Orania Dorpstraad"
- Squares 2001–4200: general public
- Sponsor squares are still purchasable by the public (display "Dra ook by")
- Cumulative sponsor contribution tracked for dashboard

### Database Changes
**New Square columns:**
- `SponsorshipType` (INT, nullable) — 0=None, 1=OraniaOntwikkelingsMaatskapy, 2=OraniaDorpstraad
- `IsPublicSquare` (BOOL, default false) — true for squares 2001-4200

**New migration:** `AddSponsorshipAndPublicSquareFields`

### Seed Data
Update `AppDbContext.SeedAsync`:
- Squares 1–1000: `SponsorshipType = OraniaOntwikkelingsMaatskapy`, `IsPublicSquare = false`
- Squares 1001–2000: `SponsorshipType = OraniaDorpstraad`, `IsPublicSquare = false`
- Squares 2001–4200: `SponsorshipType = None`, `IsPublicSquare = true`
- Reduce seeded squares from 4500 to 4200 to match road geometry

### Map Display
- Sponsor squares: gold/dark-green fill color, tooltip: `"Borg: Orania Ontwikkelings Maatskapy — Dra ook by"`
- Public squares: current color scheme (status-based)
- Both are clickable/selectable for purchase

### Files Changed
| File | Change |
|------|--------|
| `src/DiamantLaan.Api/Models/Square.cs` | Add `SponsorshipType` and `IsPublicSquare` properties |
| `src/DiamantLaan.Api/Models/Enums/SponsorshipType.cs` | New enum file |
| `src/DiamantLaan.Api/Data/AppDbContext.cs` | Update seed data |
| `src/DiamantLaan.Api/Migrations/..._AddSponsorship.cs` | New migration |
| `src/DiamantLaan.Web/src/app/models/square.ts` | Add sponsorship fields to TypeScript interface |
| `src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.ts` | Add sponsor color/style rendering |
| `src/DiamantLaan.Api/Controllers/RoadController.cs` | Return sponsorship fields in SquareDto |

## 3. Allow Purchase of Squares at Any Status

### Current Behavior
Only squares with `Status == NogNieBeginNie` (0) can be purchased.

### New Behavior
Any unsold square (`OwnerId == null`) can be purchased regardless of construction status (0-3). Only sold squares (`OwnerId != null`) are excluded.

### Files Changed
| File | Change |
|------|--------|
| `src/DiamantLaan.Api/Controllers/PurchaseController.cs:36-37` | Remove status check; only validate `OwnerId == null` |
| `src/DiamantLaan.Web/src/app/components/map/map.component.ts:234` | Remove status filter from `toggleSquare()` selection logic |

## 4. Add Phone Number and Resident Status to Registration

### New Fields
- **Phone Number** ("Foon Nommer") — already exists as `PhoneNumber` column on `AspNetUsers` (from `IdentityUser`), currently not populated
- **Is Orania Resident** ("Inwoner van Orania?") — new bool column

### Database Changes
**New migration:** `AddIsOraniaResidentToUser`
- Add `IsOraniaResident` (BOOL, NOT NULL, default false) to `AspNetUsers`

### Registration Flow
1. `RegisterDto` adds `PhoneNumber` (string, optional) and `IsOraniaResident` (bool)
2. `AuthController.POST /api/auth/register` stores both fields on the User entity
3. JWT token claims include `IsOraniaResident`
4. `RegisterComponent` form adds:
   - Phone input field with label "Foon Nommer"
   - Checkbox with label "Inwoner van Orania?"

### Files Changed
| File | Change |
|------|--------|
| `src/DiamantLaan.Api/Models/User.cs` | Add `IsOraniaResident` property |
| `src/DiamantLaan.Api/Models/Dtos/RegisterDto.cs` | Add `PhoneNumber` and `IsOraniaResident` fields |
| `src/DiamantLaan.Api/Controllers/AuthController.cs` | Store new fields on user creation; add to JWT claims |
| `src/DiamantLaan.Api/Migrations/..._AddIsOraniaResident.cs` | New migration |
| `src/DiamantLaan.Web/src/app/models/user.ts` | Add fields to AuthResponse interface |
| `src/DiamantLaan.Web/src/app/components/register/register.component.ts` | Add form controls |
| `src/DiamantLaan.Web/src/app/components/register/register.component.html` | Add form inputs |

### Verification
- Admin user secrets confirmed: `admin@diamantlaan.co.za` / `Admin123!` (no changes needed)

## 5. Admin Statistics Dashboard

### Route Structure
- `/admin` → existing map-based status update tool (unchanged)
- `/admin/stats` → new statistics dashboard

### Layout
Two-column layout:
- **Left column (60%):** Daily sales bar/line chart (top), buyer info table (bottom) with search/sort/CSV export
- **Right column (40%):** Revenue progress bar, status distribution donut chart, sponsor vs public pie chart

### Charts & Tables

| Component | Description | Data Source |
|-----------|-------------|-------------|
| Daily sales chart | Bar chart — revenue per day for last 30 days, line overlay of cumulative total | New API: `GET /api/admin/daily-sales` |
| Buyer table | Columns: Name, Email, Phone, Resident?, Squares Owned, Total Spent. Sortable, searchable with text filter | Enhanced: `GET /api/admin/buyers` |
| CSV export | "Laai Af as CSV" button exports buyer table | Same endpoint, `Accept: text/csv` or query param |
| Revenue progress | Horizontal progress bar: R2m sponsor baseline + public purchases vs total | Existing `GET /api/admin/stats` enhanced |
| Status distribution | Donut chart: squares by status (4 segments) | Existing `GET /api/admin/stats` |
| Sponsor vs public | Pie chart: squares sold in sponsor section vs public section | Existing stats endpoint enhanced |

### New/Enhanced API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/daily-sales` | GET | Returns `{ date, revenue, purchaseCount }[]` for last 30 days |
| `/api/admin/buyers` | GET | Returns `{ userId, name, email, phone, isResident, squareCount, totalSpent }[]` with optional `?format=csv` |
| `/api/admin/stats` (enhanced) | GET | Add `sponsorSquaresSold`, `publicSquaresSold`, `sponsorRevenue`, `publicRevenue` fields |

### Frontend Chart Library
**Chart.js** + **ng2-charts** (Angular wrapper). Already compatible with Angular 19 standalone components.

### Files Changed
| File | Change |
|------|--------|
| `src/DiamantLaan.Api/Controllers/AdminController.cs` | Add daily-sales endpoint, buyers endpoint, enhance stats |
| `src/DiamantLaan.Api/Models/Dtos/` | New DTOs: `DailySalesDto`, `BuyerDto`, `EnhancedStatsDto` |
| `src/DiamantLaan.Web/package.json` | Add `chart.js` and `ng2-charts` dependencies |
| `src/DiamantLaan.Web/src/app/app.routes.ts` | Add `/admin/stats` route |
| `src/DiamantLaan.Web/src/app/components/admin/` | New `admin-stats` component |
| `src/DiamantLaan.Web/src/app/services/admin.service.ts` | Add API methods for new endpoints |
| `src/DiamantLaan.Web/src/app/components/shared/navbar/` | Add "Statistiek" sub-link under Admin section |

## Out of Scope
- Payment gateway integration (already noted as "future" in existing code)
- Hexagonal tiling (user decided to stay with squares)
- Two separate display numbering systems (single 1-4200)

## Migration Order
1. `AddSponsorshipAndPublicSquareFields` — add columns to Square
2. `AddIsOraniaResidentToUser` — add column to AspNetUsers
3. Update seed data to reflect new square designations
