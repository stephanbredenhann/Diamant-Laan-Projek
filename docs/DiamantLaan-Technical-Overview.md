# Diamant Laan Projek — Technical Overview

## Purpose

Diamant Laan is a **community road paving crowdfunding platform** for a private road ("Diamant Laan") in Orania. Residents purchase 1m² sections ("blokke"/squares) of the road for R500 each, funding its construction. Buyers track construction progress on an interactive map; administrators manage status updates and view sales data.

The road is **700m long, 6m wide = 4,200 squares** total, mapped along real-world GPS coordinates.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | ASP.NET Core 8.0 Web API |
| Frontend | Angular 19.2 (standalone SPA) |
| Database | SQLite via Entity Framework Core 8.0 |
| Authentication | ASP.NET Core Identity + JWT Bearer |
| Mapping | Leaflet 1.9.4 + OpenStreetMap tiles |
| Hosting | Azure App Service (F1 free tier, Linux) |
| Languages | C# (backend), TypeScript (frontend) |
| UI Language | Afrikaans |

---

## Project Structure

```
src/
├── DiamantLaan.Api/                    # ASP.NET Core 8 Web API
│   ├── Controllers/
│   │   ├── AuthController.cs           # Register + Login
│   │   ├── AdminController.cs          # Bulk status update, stats, purchases
│   │   ├── RoadController.cs           # Public squares list + stats
│   │   ├── PurchaseController.cs       # Create + retrieve purchases
│   │   └── MySquaresController.cs      # User's owned squares
│   ├── Data/
│   │   └── AppDbContext.cs             # EF Core DbContext + seed data
│   ├── Migrations/
│   │   ├── 20260605111857_InitialCreate.cs
│   │   ├── 20260605111857_InitialCreate.Designer.cs
│   │   └── AppDbContextModelSnapshot.cs
│   ├── Models/
│   │   ├── User.cs                     # Extends IdentityUser (FirstName, LastName)
│   │   ├── Square.cs                   # Id, Status, OwnerId, Owner
│   │   ├── Purchase.cs                 # Id, UserId, PurchaseDate, Amount
│   │   ├── PurchaseSquare.cs           # Junction: Purchase ↔ Square
│   │   ├── Enums/
│   │   │   └── SquareStatus.cs         # NogNieBeginNie, Voorberei, BesigOmTeTeer, KlaarGeteer
│   │   └── Dtos/
│   │       ├── RegisterDto.cs
│   │       ├── LoginDto.cs
│   │       ├── SquareDto.cs
│   │       ├── PurchaseRequestDto.cs
│   │       └── BulkStatusUpdateDto.cs
│   ├── Program.cs                      # App entry: Identity, JWT, CORS, seeding
│   ├── appsettings.json                # Non-sensitive config (JWT issuer, DB path)
│   ├── Properties/launchSettings.json  # Dev launch: localhost:5000
│   └── wwwroot/                        # Built Angular SPA (from Release build)
│
└── DiamantLaan.Web/                    # Angular 19 SPA
    ├── package.json                    # Angular 19.2, Leaflet 1.9.4 deps
    ├── proxy.conf.json                 # Dev proxy to localhost:5000
    └── src/app/
        ├── app.config.ts               # Providers: router, HTTP, interceptor
        ├── app.routes.ts               # Lazy-loaded routes
        ├── components/
        │   ├── home/                   # Landing page with road stats
        │   ├── map/                    # Public square selection map
        │   │   └── map-segments.ts     # Road segment definitions + GPS waypoints
        │   ├── register/               # Registration form (inline template)
        │   ├── login/                  # Login form (inline template)
        │   ├── payment/                # Checkout page (payment not yet integrated)
        │   ├── my-squares/             # User's owned squares list
        │   ├── admin/                  # Admin panel: map + bulk status updates
        │   └── shared/
        │       ├── navbar/             # Sticky navigation bar
        │       ├── road-map/           # Leaflet map wrapper component
        │       │   ├── road-map.component.ts   # Core Leaflet component
        │       │   ├── road-map.component.html
        │       │   ├── road-map.component.scss
        │       │   └── coordinate-config.ts    # GeoJSON polygon generation
        │       └── status-badge/       # Status label component
        ├── services/
        │   ├── auth.service.ts         # Login, register, JWT storage, current user signal
        │   ├── road.service.ts         # Public squares + stats API
        │   ├── purchase.service.ts     # Purchase + MySquares API
        │   └── admin.service.ts        # Admin status update + stats API
        ├── guards/
        │   ├── auth.guard.ts           # Redirect to login if not authenticated
        │   └── admin.guard.ts          # Redirect to home if not admin
        ├── interceptors/
        │   └── auth.interceptor.ts     # Attaches JWT Bearer to all requests
        └── models/
            ├── square.ts               # Square interface, SquareStatus enum, STATUS_LABELS
            └── user.ts                 # AuthResponse interface
```

---

## Database Schema

### Custom Tables

**Squares**
| Column | Type | Notes |
|--------|------|-------|
| Id | INT (PK) | 1–4500 seeded, 4200 mapped |
| Status | INT | 0=NogNieBeginNie, 1=Voorberei, 2=BesigOmTeTeer, 3=KlaarGeteer |
| OwnerId | TEXT (FK→AspNetUsers, nullable) | null = unsold |

**Purchases**
| Column | Type | Notes |
|--------|------|-------|
| Id | INT (PK) | Auto-increment |
| UserId | TEXT (FK→AspNetUsers) | Who bought |
| PurchaseDate | TEXT (DateTime) | Defaults to UtcNow |
| Amount | REAL | Total in Rands |

**PurchaseSquares** (junction)
| Column | Type | Notes |
|--------|------|-------|
| PurchaseId | INT (FK→Purchases) | Composite PK |
| SquareId | INT (FK→Squares) | Composite PK |

### ASP.NET Identity Tables
`AspNetUsers`, `AspNetRoles` (Admin, Buyer), `AspNetUserRoles`, `AspNetRoleClaims`, `AspNetUserClaims`, `AspNetUserLogins`, `AspNetUserTokens`.

**Custom User fields:** `FirstName`, `LastName` (added to `AspNetUsers`).

**PhoneNumber** exists on `AspNetUsers` from IdentityUser base class but is not currently populated.

---

## API Endpoints

### Public (no auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/road/squares` | All 4200 squares: id, status, isSold |
| GET | `/api/road/stats` | Progress %, total raised (R) |
| POST | `/api/auth/register` | Create account: email, password, firstName, lastName → JWT token |
| POST | `/api/auth/login` | Login: email, password → JWT token + user + roles |

### Authenticated (Buyer role +)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/my-squares` | Current user's owned squares |
| POST | `/api/purchase` | Buy squares: squareIds[] → purchase record |
| GET | `/api/purchase/{id}` | Get single purchase details (user-scoped) |

### Admin only

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/admin/squares/status` | Bulk update square statuses |
| GET | `/api/admin/purchases` | All purchases with user info |
| GET | `/api/admin/stats` | Total squares, progress, total raised, per-status counts |

### Validation Rules
- Squares can only be advanced one status step at a time (no skipping)
- Cannot downgrade from `KlaarGeteer` (completed is final)
- Currently: only `NogNieBeginNie` (not started) squares can be purchased
- Price: fixed R500 per square (hardcoded in both frontend and backend)

---

## Authentication Flow

1. User registers via POST `/api/auth/register` with email, password, first name, last name
2. User is created in ASP.NET Identity, assigned "Buyer" role
3. JWT token generated with claims: NameIdentifier, Email, GivenName, Surname, Role
4. Token signed with HMAC-SHA256, expires after 24 hours
5. Frontend stores token + user in localStorage, attaches via auth interceptor to all requests
6. Route guards check authentication and admin role before page access

**Admin user seeded on first run** from config:
- Email: `admin@diamantlaan.co.za` (from user secrets)
- Password: `Admin123!` (from user secrets)
- Assigned "Admin" role

---

## Map & Geometry

### How Squares Are Positioned

1. 13 GPS waypoints define the real-world road path (in `map-segments.ts`)
2. Cumulative haversine distances build a polyline (~700m total)
3. Each square ID (1–4200) maps to:
   - `roadPos = floor((sqId - 1) / 6)` → position along road (0–699)
   - `widthIdx = (sqId - 1) % 6` → lateral position across road (0–5)
4. Polyline interpolation finds the GPS point at that distance
5. Perpendicular bearing offsets the point laterally for road width (centered on path, ±2.5m)
6. Four corners calculated for a 1m × 1m square polygon
7. All 4200 squares assembled into a GeoJSON FeatureCollection
8. Rendered on Leaflet L.canvas() overlay on OpenStreetMap tiles

### Road Segments (5 total)
| Segment | Name | Squares | Length |
|---------|------|---------|--------|
| 1 | Reguit 130m | 1–780 | 130m vertical |
| 2 | Draai Links 100m | 781–1380 | 100m turn left |
| 3 | Reguit 170m | 1381–2400 | 170m horizontal |
| 4 | Draai Regs | 2401–2460 | 10m kink |
| 5 | Reguit 290m | 2461–4200 | 290m vertical |

### Known Issue
At road curves (segments 2 and 4), outer-radius squares overlap inner squares because all 6 width-positions share identical longitudinal spacing. This is addressed by the curve overlap fix enhancement.

---

## Business Rules

| Rule | Current State |
|------|---------------|
| Purchase eligibility | Squares must have status `NogNieBeginNie` (0) and no owner |
| Price per square | R500 (hardcoded) |
| Status progression | Must advance step-by-step (0→1→2→3) |
| Status downgrade | Not allowed from `KlaarGeteer` (3) |
| Max selectable squares | 4200 (segment 5 endId guard) |
| Seed square count | 4500 (but only 4200 are mapped/selectable) |

---

## Admin Functionality (Current)

- **Map-based status management** at `/admin`: click squares, apply new status via dropdown
- **3 stat cards**: Progress %, Total Raised, Selected Count
- **Bulk status update**: Select multiple squares, set all to a target status
- All admin endpoints require `[Authorize(Roles = "Admin")]`

---

## Payment Status

**Payment gateway is NOT integrated.** The `/betaal` page displays a placeholder: _"Betaling word in die toekoms geintegreer."_ Purchases are created directly on the backend without any payment processing.

---

## Seed Data

On first startup, `AppDbContext.SeedAsync`:
1. Creates "Admin" and "Buyer" identity roles
2. Creates admin user from config
3. Seeds 4500 squares (IDs 1–4500) with status `NogNieBeginNie`

---

## Configuration

### User Secrets (Development)
```bash
dotnet user-secrets set --project src/DiamantLaan.Api "AdminUser:Email" "admin@diamantlaan.co.za"
dotnet user-secrets set --project src/DiamantLaan.Api "AdminUser:Password" "Admin123!"
dotnet user-secrets set --project src/DiamantLaan.Api "Jwt:Key" "DiamantLaanSuperSecretKey2026ForJwtTokenGeneration!"
```

### Production (Azure App Settings)
```
AdminUser__Email
AdminUser__Password
Jwt__Key
```

### appsettings.json
- `ConnectionStrings:DefaultConnection` = `Data Source=diamantlaan.db`
- `Jwt:Issuer` = `DiamantLaanApi`
- `Jwt:Audience` = `DiamantLaanWeb`
- `Jwt:ExpireMinutes` = `1440` (24 hours)
