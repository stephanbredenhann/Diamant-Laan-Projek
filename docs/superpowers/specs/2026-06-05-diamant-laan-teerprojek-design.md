# Diamant Laan Teerprojek — Design Spec

**Date:** 2026-06-05
**Status:** Approved

---

## 1. Overview

A crowd-funding web app for paving Diamant Laan, a ~750m × 6m S-shaped dirt road. Residents buy individual square meters (R500 each) and track their squares' paving progress. The app uses **C# .NET 8** (API), **Angular** (SPA), **MSSQL** with **EF Core 8**, and ASP.NET Identity for auth.

The entire UI is in **Afrikaans**.

**Platforms:** Desktop + mobile responsive (no native mobile app).

---

## 2. Road Layout

Diamant Laan has 5 segments forming an S-shape:

| # | Name | Length | Orientation | Square IDs |
|---|------|--------|-------------|------------|
| 1 | Reguit 130m | 130m | Vertical | 1–780 |
| 2 | Draai Links 100m | 100m | Curve (90° left) | 781–1380 |
| 3 | Reguit 170m | 170m | Horizontal | 1381–2400 |
| 4 | Draai Regs | ~10m | Curve (90° right at T-junction) | 2401–2460 |
| 5 | Reguit 290m | 290m | Vertical | 2461–4200 |

Total: ~750m road, ~4,200m² (curve segments slightly less than straight equivalents). Exact square count determined by precise mapping in frontend.

The road layout is **hardcoded in the Angular frontend** as an SVG/Canvas 2D grid. Each square knows its ID (1–~4500).

---

## 3. Data Model

### 3.1 Entities

**User** (ASP.NET Identity)
- `Id`, `Email`, `Name` (first + last), `Role` (Buyer / Admin)
- Password hashed by ASP.NET Identity by default

**Square**
- `Id` (int, PK, 1–~4500)
- `Status` (enum: `NogNieBeginNie=0`, `Voorberei=1`, `BesigOmTeTeer=2`, `KlaarGeteer=3`)
- `OwnerId` (nullable FK → User)

**Purchase**
- `Id` (int, PK)
- `UserId` (FK → User)
- `PurchaseDate` (datetime)
- `Amount` (decimal, total in ZAR)

**PurchaseSquare**
- `PurchaseId` (FK → Purchase)
- `SquareId` (FK → Square)
- Composite PK: (PurchaseId, SquareId)

### 3.2 Seed Data
- Squares 1–~4500: all seeded with `Status = NogNieBeginNie`, `OwnerId = null`
- 1 Admin user: seeded via migration
- No segment data in database (hardcoded in frontend)

---

## 4. API Endpoints

### 4.1 Public (no auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register (Name, Email, Password). Returns JWT. |
| POST | `/api/auth/login` | Login (Email, Password). Returns JWT. |
| GET | `/api/road/squares` | Returns all squares (ID, Status only — no OwnerId exposed publicly). |

### 4.2 Buyer (JWT + Buyer role)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/my-squares` | List squares owned by current user with statuses |
| POST | `/api/purchase` | Body: `{ SquareIds: [1,2,3] }`. Validates squares are available (not owned). Creates Purchase + PurchaseSquares in "pending" state, assigns squares to user. Returns purchase ID. |
| GET | `/api/purchase/{id}` | Get purchase details |

### 4.3 Admin (JWT + Admin role)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/api/admin/squares/status` | Body: `{ SquareIds: [...], Status: 1 }`. Bulk update. Cannot revert from `KlaarGeteer` (3) to lower. |
| GET | `/api/admin/purchases` | List all purchases |
| GET | `/api/admin/stats` | Summary: count per status, total raised |

### 4.4 Auth & Security
- JWT Bearer token auth
- ASP.NET Identity password hashing (default)
- `[Authorize(Roles = "Admin")]` on all admin endpoints
- `[Authorize]` on buyer endpoints
- All endpoints validate JWT; no unauthenticated writes
- HTTPS enforced in production

---

## 5. Frontend (Angular)

### 5.1 Tech
- Angular (latest installed version)
- Standalone components
- No Angular Material — custom CSS with CSS variables
- Mobile-first responsive design
- SVG or Canvas for the road map

### 5.2 Color Palette
- **Primary:** Orange (`#f97316`)
- **Background:** White (`#ffffff`)
- **Surface:** Light gray (`#f9fafb` / `#f3f4f6`)
- **Text:** Dark gray (`#1f2937`)
- **Status colors (map squares):**
  - `NogNieBeginNie` — Gray (`#d1d5db`)
  - `Voorberei` — Yellow/Amber (`#fbbf24`)
  - `BesigOmTeTeer` — Orange/Blue (`#3b82f6`)
  - `KlaarGeteer` — Green (`#22c55e`)

### 5.3 Routes

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/` | `HomeComponent` | None | Landing page with hero + overview map + stats |
| `/kaart` | `MapComponent` | None (view only) | Full interactive road map. Purchase requires login. |
| `/registreer` | `RegisterComponent` | None | Registration form |
| `/meld-aan` | `LoginComponent` | None | Login form |
| `/my-blokke` | `MySquaresComponent` | Buyer | List of user's purchased squares |
| `/betaal` | `PaymentComponent` | Buyer | Mock payment page |
| `/admin` | `AdminComponent` | Admin | Bulk status management dashboard |

### 5.4 Page Details

#### Homepage (`/`)
- Orange navbar: "Diamant Laan Teerprojek" + "Registreer | Meld Aan" (or user name if logged in)
- Hero section: large S-shaped road map rendered as SVG
- Progress bar showing: "12% voltooi" (green squares / total)
- Stats row: "% voltooi", "R__ ingesamel", "R500 per m²"
- CTA button: "Sien Kaart & Koop" → `/kaart`
- Mobile: map scales down, stats stack vertically

#### Road Map (`/kaart`)
- Full-page interactive SVG/Canvas map
- S-shaped road drawn as connected segments with 6-row grids
- Each square: clickable, color-coded by status
- Hover tooltip: "Blok #1234 — Nog nie begin nie"
- Clicked squares: orange outline, added to sidebar
- Sidebar (slide-in on mobile): selected squares list, running total, "Gaan na Betaling" button
- If not logged in, clicking a square prompts login/register
- Legend for status colors

#### My Squares (`/my-blokke`)
- Table/list of purchased squares with status badges
- Mini map highlighting owned squares
- Total spent, purchase history

#### Payment (`/betaal`)
- Summary: "X blokke — R Y,000"
- Large placeholder: "Stripe/Payfast hier"
- "Betaal Nou" button → calls `POST /api/purchase/{id}/confirm`
- On success → redirect to `/my-blokke` with success message

#### Admin (`/admin`)
- Stats cards at top (count per status, total raised)
- Full grid of squares (paginated or virtual-scrolled)
- Filter by status
- Click-to-select, shift-click for range, drag-select
- Status dropdown: "Stel in as: Voorberei | Besig om te teer | Klaar geteer"
- Cannot downgrade from "Klaar geteer"

### 5.5 Mobile Responsiveness
- Navbar collapses to hamburger menu
- Road map scales to fit viewport width
- Sidebar becomes bottom sheet or overlay
- Forms are single-column
- Admin table becomes card list
- Touch-friendly: larger tap targets on map squares

---

## 6. Project Structure

```
DiamantLaan.sln
└── src/
    ├── DiamantLaan.Api/                    # .NET 8 Web API
    │   ├── Controllers/
    │   │   ├── AuthController.cs
    │   │   ├── RoadController.cs
    │   │   ├── PurchaseController.cs
    │   │   ├── MySquaresController.cs
    │   │   └── AdminController.cs
    │   ├── Models/
    │   │   ├── User.cs                     # Extends IdentityUser
    │   │   ├── Square.cs
    │   │   ├── Purchase.cs
    │   │   ├── PurchaseSquare.cs
    │   │   ├── Enums/
    │   │   │   └── SquareStatus.cs
    │   │   └── Dtos/
    │   │       ├── RegisterDto.cs
    │   │       ├── LoginDto.cs
    │   │       ├── PurchaseRequestDto.cs
    │   │       ├── BulkStatusUpdateDto.cs
    │   │       └── SquareDto.cs
    │   ├── Data/
    │   │   ├── AppDbContext.cs
    │   │   └── Migrations/
    │   └── Program.cs
    │
    └── DiamantLaan.Web/                    # Angular app
        └── src/
            ├── app/
            │   ├── components/
            │   │   ├── home/
            │   │   ├── map/
            │   │   ├── register/
            │   │   ├── login/
            │   │   ├── my-squares/
            │   │   ├── payment/
            │   │   ├── admin/
            │   │   └── shared/
            │   │       ├── navbar/
            │   │       └── status-badge/
            │   ├── services/
            │   │   ├── auth.service.ts
            │   │   ├── road.service.ts
            │   │   ├── purchase.service.ts
            │   │   └── admin.service.ts
            │   ├── models/
            │   │   └── (TypeScript interfaces)
            │   ├── guards/
            │   │   ├── auth.guard.ts
            │   │   └── admin.guard.ts
            │   └── app.routes.ts
            └── styles.scss                  # Global styles + CSS variables
```

---

## 7. Out of Scope (YAGNI)

- Real payment integration (Stripe/PayFast placeholder only)
- Real email sending (stub/log only)
- Password reset flow
- Segment management UI (hardcoded in frontend)
- Native mobile app
- Multi-language (Afrikaans only)
- Social login
- Admin user management UI (seed admin via migration only)

---

## 8. Status Workflow

```
NogNieBeginNie (0) → Voorberei (1) → BesigOmTeTeer (2) → KlaarGeteer (3)
```

- Admin can advance status forward only
- Cannot skip statuses (must go 0→1→2→3)
- Cannot revert from KlaarGeteer
- Purchase only allowed on squares with status 0 (NogNieBeginNie)
