# Diamant Laan — Road Paving Crowdfunding Platform

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | ASP.NET Core 8.0 Web API |
| Frontend | Angular 19.2 (standalone SPA) |
| Database | SQLite via Entity Framework Core 8.0 |
| Auth | ASP.NET Core Identity + JWT Bearer |
| Mapping | Leaflet 1.9 + OpenStreetMap |
| Email | Resend (pluggable via `IEmailService`) |
| Payments | PayFast (merchant-hosted integration) |
| Hosting | Azure App Service (F1 free tier, Linux) |

## Project Structure

```
src/
├── DiamantLaan.Api/                # ASP.NET Core 8 Web API
│   ├── Controllers/                # API endpoints
│   │   ├── AuthController.cs       # Login, register, refresh, logout, forgot/reset password
│   │   ├── AdminController.cs      # Bulk status updates, stats, manual purchases, undo, diagnostics
│   │   ├── PaymentController.cs    # PayFast ITN handler, sandbox ITN simulator
│   │   ├── PurchaseController.cs   # Create/pay/cancel purchases
│   │   ├── RoadController.cs       # Public road grid data (square statuses)
│   │   ├── MySquaresController.cs  # User's owned squares + summary
│   │   ├── ImagesController.cs     # Progress image upload/view per square
│   │   ├── ProfileController.cs    # View/update profile, change email/password, delete account
│   │   └── SettingsController.cs   # Public home stats toggle + health endpoint
│   ├── Data/
│   │   └── AppDbContext.cs         # EF Core context, seeds 4500 squares + admin user on startup
│   ├── Middleware/
│   │   └── MustChangePasswordMiddleware.cs  # Blocks non-password-change routes for flagged users
│   ├── Migrations/                 # EF Core migrations (committed, applied on startup)
│   ├── Models/
│   │   ├── Dtos/                   # Request/response DTOs
│   │   ├── Enums/                  # SquareStatus, PaymentStatus
│   │   ├── PayFastSettings.cs      # PayFast config POCO
│   │   ├── ResendSettings.cs       # Email config POCO
│   │   └── *.cs                    # Entities: User, Square, Purchase, RefreshToken, etc.
│   ├── Services/                   # Business logic (21 services)
│   ├── Validation/                 # EmailValidator, PasswordValidator, PhoneValidator
│   ├── wwwroot/                    # Compiled Angular SPA (populated by dotnet publish)
│   ├── Program.cs                  # App entry point (DI, middleware, rate limiting, seed)
│   └── appsettings.json            # Default configuration
├── DiamantLaan.Web/                # Angular 19 SPA
│   └── src/app/
│       ├── components/             # 24 component directories (see table below)
│       ├── guards/                 # auth.guard.ts, admin.guard.ts, must-change-password.guard.ts
│       ├── interceptors/           # auth.interceptor.ts (attaches JWT Bearer to requests)
│       ├── services/               # auth, admin, road, purchase, profile, image, share, download
│       ├── models/                 # TypeScript interfaces (user, square, site-settings)
│       └── utils/                  # Afrikaans helpers, PDF export, phone validation
└── tests/
    └── DiamantLaan.Api.Tests/      # xUnit + Moq + EF Core InMemory
```

### Angular Components

| Path | Component | Access |
|------|-----------|--------|
| `/` | `home` | Public |
| `/kaart` | `map` | Public |
| `/registreer` | `register` | Public |
| `/meld-aan` | `login` | Public |
| `/wagwoord-vergeet` | `forgot-password` | Public |
| `/wagwoord-herstel` | `reset-password` | Public |
| `/wagwoord-wysig-verplig` | `required-password-change` | Auth |
| `/my-profiel` | `profile` | Auth + MustChangePw |
| `/my-blokke` | `my-squares` | Auth + MustChangePw |
| `/my-blokke/sertifikaat` | `certificate` | Auth + MustChangePw |
| `/my-transaksies` | `my-transactions` | Auth + MustChangePw |
| `/betaal` | `payment` | Auth + MustChangePw |
| `/betalings/terug` | `payment-return` | Public |
| `/betalings/kanselleer` | `payment-cancel` | Public |
| `/privaatheid` | `privacy` | Public |
| `/admin` | `admin-layout` > children | Admin only |
| `/admin` (default) | `admin` | Admin |
| `/admin/fotos` | `admin-images` | Admin |
| `/admin/stats` | `admin-stats` | Admin |
| `/admin/gebruikers` | `admin-users` | Admin |
| `/admin/transaksies` | `admin-transactions` | Admin |
| `/admin/telefoon-aankoop` | `admin-manual-purchase` | Admin |
| `/admin/instellings` | `admin-settings` | Admin |

---

## Getting the System Running

### Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/)
- Angular CLI (`npm install -g @angular/cli`)

### Development Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd "<repo-folder>"

# 2. Install Angular dependencies
cd src/DiamantLaan.Web
npm install

# 3. Return to repo root and set user secrets
cd ../..

# --- REQUIRED: JWT signing key (min 32 bytes) ---
dotnet user-secrets set --project src/DiamantLaan.Api "Jwt:Key" "your-super-secret-key-with-at-least-32-bytes!!"

# --- REQUIRED: Admin user for seeding ---
dotnet user-secrets set --project src/DiamantLaan.Api "AdminUser:Email" "admin@example.com"
dotnet user-secrets set --project src/DiamantLaan.Api "AdminUser:Password" "Admin123!"

# --- OPTIONAL (emails won't send if omitted, see Email Subsystem) ---
dotnet user-secrets set --project src/DiamantLaan.Api "Resend:ApiKey" "re_your_api_key"
dotnet user-secrets set --project src/DiamantLaan.Api "Resend:FromEmail" "noreply@yourdomain.com"

# --- OPTIONAL (PayFast sandbox, payments won't work if omitted) ---
dotnet user-secrets set --project src/DiamantLaan.Api "PayFast:MerchantId" "10000100"
dotnet user-secrets set --project src/DiamantLaan.Api "PayFast:MerchantKey" "46f0cd694581a"
dotnet user-secrets set --project src/DiamantLaan.Api "PayFast:Passphrase" "your_passphrase"

# 4. Run API (terminal 1)
dotnet run --project src/DiamantLaan.Api
# API: http://localhost:5000 (Swagger: http://localhost:5000/swagger)

# 5. Run Angular dev server (terminal 2)
cd src/DiamantLaan.Web
ng serve
# Frontend: http://localhost:4200 (proxies /api to localhost:5000)
```

### Production Build

```bash
dotnet publish src/DiamantLaan.Api/DiamantLaan.Api.csproj -c Release -o publish
```

The `.csproj` has an MSBuild target that runs `npm install && npm run build` in the Angular project, then copies `dist/diamant-laan.web/` into `wwwroot/`. The `publish/` directory is a self-contained deployment.

On startup, `MigrateAsync()` applies any pending EF Core migrations automatically.

---

## Environment Variables / Configuration

All configuration is read from `appsettings.json` and overridden by `dotnet user-secrets` (local dev) or Azure App Settings (production). On other hosting platforms, use environment variables (the ASP.NET Core configuration system maps `Section__Key` to environment variables automatically).

### Required

| Key | Description |
|-----|-------------|
| `Jwt:Key` | HMAC-SHA256 signing key. **Must be at least 32 bytes (characters).** The app will throw on startup if missing or too short. |
| `AdminUser:Email` | Email for the seeded admin account. |
| `AdminUser:Password` | Password for the seeded admin account. Must meet the password policy (8+ chars, digit, uppercase, lowercase, special char). |
| `Jwt:Issuer` | Token issuer claim (default: `DiamantLaanApi`). |
| `Jwt:Audience` | Token audience claim (default: `DiamantLaanWeb`). |
| `ConnectionStrings:DefaultConnection` | Database connection string (default: `Data Source=diamantlaan.db`). See [Database Migration](#database-migration) below. |

### Optional

| Key | Default | Description |
|-----|---------|-------------|
| `Jwt:ExpireMinutes` | `60` | Access token lifetime in minutes. |
| `Jwt:RefreshExpireDays` | `7` | Refresh token lifetime in days. |
| `Resend:ApiKey` | *(empty)* | Resend API key for transactional emails. Emails silently skip if unset. |
| `Resend:FromEmail` | *(empty)* | Sender "from" address for emails. Must be verified in Resend dashboard. |
| `PayFast:MerchantId` | *(empty)* | PayFast merchant ID. |
| `PayFast:MerchantKey` | *(empty)* | PayFast merchant key. |
| `PayFast:Passphrase` | *(empty)* | PayFast signature passphrase. Must match the PayFast dashboard setting. |
| `PayFast:Sandbox` | `true` | `true` = sandbox URLs, `false` = live PayFast URLs. |
| `PayFast:ProcessUrl` | Sandbox/live auto | Override the PayFast payment form URL. |
| `PayFast:QueryUrl` | Sandbox/live auto | Override the PayFast ITN validation URL. |
| `PayFast:NotifyUrl` | Auto-generated | Override the ITN callback URL. Defaults to `{baseUrl}api/payment/itn`. |
| `PayFast:FrontendBaseUrl` | *(empty)* | Base URL of the frontend (used for `return_url` and `cancel_url` on the PayFast form). Falls back to the API base URL if unset. |
| `App:PublicUrl` | `http://localhost:4200` | Public frontend base URL. Used to generate login links in emails. |

### Environment Variable Mapping

When configuring via environment variables (Docker, non-Azure hosting), use double underscores:

```bash
ConnectionStrings__DefaultConnection="Data Source=/data/diamantlaan.db"
Jwt__Key="your-super-secret-key-at-least-32-chars!!"
AdminUser__Email="admin@example.com"
AdminUser__Password="Admin123!"
Resend__ApiKey="re_xxx"
Resend__FromEmail="noreply@yourdomain.com"
PayFast__MerchantId="10000100"
PayFast__MerchantKey="46f0cd694581a"
PayFast__Passphrase="your_passphrase"
PayFast__Sandbox="true"
PayFast__FrontendBaseUrl="https://your-frontend.com"
App__PublicUrl="https://your-frontend.com"
```

The `PORT` environment variable is also respected — if set, the app listens on `http://*:{PORT}`.

---

## Email Subsystem

### Architecture

```
User Action (register, forgot-pw, manual purchase)
       │
       ▼
  EmailOutboxService.QueueAsync()
       │
       ├──▶ Writes PendingEmail record to SQLite
       └──▶ Tries immediate send via IEmailService
              │
              ▼
         ResendEmailService (Resend SDK)
              │
              ▼
         Resend API (resend.com)

Background: EmailOutboxBackgroundService (every 2 min)
       │
       ▼
  Flushes any PendingEmail records where Sent=false
```

### Overview

The email subsystem sends three types of transactional emails:

1. **Password Reset OTP** — 6-character alphanumeric code, valid for 15 minutes. Triggered by `POST /api/auth/forgot-password`. (`EmailTemplates.PasswordResetOtp`)
2. **Manual Purchase Welcome** — Sent when an admin creates a purchase on behalf of a new user. Contains the user's email and a temporary password. (`EmailTemplates.ManualPurchaseWelcome`)
3. **Block Progress Summary** — Sent to owners when an admin updates the status of their squares. Lists block counts per status and links to "My Blocks". Users can opt out via profile settings (`ReceiveBlockProgressEmails`). (`EmailTemplates.BlockProgressSummary`)

### Outbox Pattern

All emails flow through `EmailOutboxService`, which persists every email to the `PendingEmails` table **before** attempting delivery. This provides:

- **Durability** — emails survive app restarts and are retried
- **Retry tracking** — `AttemptCount` increments on each delivery attempt
- **Background flush** — `EmailOutboxBackgroundService` runs every 2 minutes to retry any unsent emails
- **Shutdown flush** — All pending emails are flushed when the app stops

### Current Provider: Resend

The system uses [Resend](https://resend.com) via the `Resend` NuGet package. The implementation is in `ResendEmailService.cs` (via the `IEmailService` interface).

**Configuration:** Requires `Resend:ApiKey` and `Resend:FromEmail` (the "from" domain must be verified in your Resend dashboard).

### How to Migrate to Mailchimp (Mandrill)

The email system is designed to be provider-agnostic through the `IEmailService` interface:

```csharp
// Services/IEmailService.cs
public interface IEmailService
{
    Task<bool> SendAsync(string to, string subject, string html,
        string? idempotencyKey = null, CancellationToken cancellationToken = default);
}
```

**Step 1: Install the Mailchimp/ Mandrill package**

Since this project has no transactional email SDK other than Resend, you will need to add a Mailchimp package.

```bash
dotnet add src/DiamantLaan.Api package Mailchimp.Transactional
```

**Step 2: Create the Mandrill implementation**

Create a new file `src/DiamantLaan.Api/Services/MandrillEmailService.cs`:

```csharp
using DiamantLaan.Api.Models;
using Microsoft.Extensions.Options;
using mandrill; // Mailchimp.Transactional namespace

public class MandrillEmailService : IEmailService
{
    private readonly MandrillSettings _settings;
    private readonly ILogger<MandrillEmailService> _logger;

    public MandrillEmailService(IOptions<MandrillSettings> settings, ILogger<MandrillEmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<bool> SendAsync(string to, string subject, string html,
        string? idempotencyKey = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey) || string.IsNullOrWhiteSpace(_settings.FromEmail))
        {
            _logger.LogWarning("Mandrill not configured. Skipping email to {To}.", to);
            return false;
        }

        try
        {
            var api = new MandrillApi(_settings.ApiKey);
            var message = new EmailMessage
            {
                FromEmail = _settings.FromEmail,
                Subject = subject,
                Html = html,
                To = new List<EmailAddress> { new EmailAddress(to) }
            };
            var result = await api.SendMessageAsync(message);
            // result is a list of MandrillSendResult
            // Check result.Status == "sent"
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Mandrill send failed for {To}", to);
            return false;
        }
    }
}
```

**Step 3: Create settings model or rename `ResendSettings`**

You can either:

- **Option A**: Rename `ResendSettings` to `EmailSettings` (shared settings model).
- **Option B**: Create a separate `MandrillSettings` class and add a new config section.

**Step 4: Register the new service in `Program.cs`**

Replace:

```csharp
builder.Services.Configure<ResendSettings>(builder.Configuration.GetSection("Resend"));
builder.Services.AddSingleton<IEmailService, ResendEmailService>();
```

With:

```csharp
builder.Services.Configure<MandrillSettings>(builder.Configuration.GetSection("Mandrill"));
builder.Services.AddSingleton<IEmailService, MandrillEmailService>();
```

**Step 5: Update configuration**

Replace Resend config in `appsettings.json` and user secrets:

```json
"Mandrill": {
  "ApiKey": "your-mandrill-api-key",
  "FromEmail": "noreply@yourdomain.com"
}
```

**Step 6: Remove the Resend NuGet package**

```bash
dotnet remove src/DiamantLaan.Api package Resend
```

**Step 7: Verify**

- Check password reset emails still send (forgot password flow)
- Check manual purchase welcome emails still send (admin manual purchase)
- Check block progress notifications still send (admin status update)
- Check `GET /api/health` returns `emailConfigured: true`
- Check `GET /api/admin/diagnostics` shows email configuration status

The outbox pattern, background services, and email templates remain unchanged — only the `IEmailService` implementation is swapped.

---

## PayFast Subsystem

### Architecture

The PayFast integration follows the **merchant-hosted integration** pattern:

```
1. User selects squares → POST /api/purchase (creates Pending Purchase)
2. User clicks "Pay" → POST /api/purchase/{id}/pay
   ├── Creates MD5 signature of form fields (PHP urlencode convention)
   └── Returns form action URL and signed fields to frontend
3. Frontend auto-submits hidden form → user is redirected to PayFast
4. User completes payment on PayFast's site
5. PayFast sends ITN (Instant Transaction Notification) → POST /api/payment/itn
   ├── Parses raw form-urlencoded body
   ├── Validates signature against passphrase
   ├── Validates payment_status == "COMPLETE"
   ├── Validates amount_gross matches expected amount (±1c tolerance)
   ├── Server-side validation: POSTs back to PayFast query/validate endpoint
   └── If all checks pass: marks purchase Confirmed, assigns squares to owner
```

### Signature Generation

`PayFastService.CreateSignature()` implements PayFast's exact MD5 signing algorithm:

1. Iterate PayFast's canonical field order (`OrderedSignatureFields`)
2. URL-encode each value using **PHP `urlencode` convention** (spaces → `+`, `~` → `%7E`, etc.)
3. Concatenate as `key1=value1&key2=value2&...`
4. Append `&passphrase={urlencoded_passphrase}` (if passphrase is set)
5. Compute MD5 hash of the resulting string

### ITN Processing Flow

```
PayFast POST /api/payment/itn (form-urlencoded body)
    │
    ├─ Parse raw body
    ├─ Extract m_payment_id, pf_payment_id, payment_status
    ├─ Find Purchase by ID in database
    ├─ Verify MD5 signature
    ├─ Verify payment_status == "COMPLETE"
    ├─ Verify amount_gross matches Purchase.Amount (±0.01)
    ├─ POST back to PayFast query/validate for server-side confirmation
    ├─ If VALID:
    │   ├─ Begin transaction
    │   ├─ Reload purchase (optimistic concurrency)
    │   ├─ Check purchase is still Pending (idempotency)
    │   ├─ Set Purchase.PaymentStatus = Confirmed
    │   ├─ Assign Square.OwnerId = Purchaser's UserId
    │   └─ Commit transaction
    └─ Returns "OK" (PayFast expects this exact response)
```

### Concurrency

The `Purchase.Squares` table uses **optimistic concurrency with SQLite row versions**. If two users try to buy the same squares simultaneously, one will receive a `DbUpdateConcurrencyException` (409 Conflict) and the squares are released back to available.

### Key URLs for PayFast Integration

On PayFast's side, you need to configure the ITN URL. The default ITN URL is:

```
{API_BASE_URL}/api/payment/itn
```

This is auto-generated from `Request.Scheme://Host` when creating a payment. You can override it with `PayFast:NotifyUrl` in configuration.

The `return_url` and `cancel_url` point to the frontend:
- `{FRONTEND_URL}/betalings/terug?purchaseId={id}` (success return)
- `{FRONTEND_URL}/betalings/kanselleer?purchaseId={id}` (cancel return)

These are resolved via `PayFast:FrontendBaseUrl` (falls back to API base URL). The frontend pages at those routes call the API to verify the final purchase status.

### Sandbox vs Production

| Setting | Sandbox | Production |
|---------|---------|------------|
| `PayFast:Sandbox` | `true` | `false` |
| Process URL | `https://sandbox.payfast.co.za/eng/process` | `https://www.payfast.co.za/eng/process` |
| ITN Query URL | `https://sandbox.payfast.co.za/eng/query/validate` | `https://www.payfast.co.za/eng/query/validate` |

The URLs auto-switch based on `Sandbox` unless explicitly overridden by `ProcessUrl`/`QueryUrl`.

### Sandbox ITN Simulator (Development Only)

A dev-only endpoint `POST /api/payment/simulate-itn` lets you simulate PayFast ITN callbacks without actually paying. Returns 404 in production.

### Payment Flow States

```
NogNieBeginNie (not started)
    │
    ▼ User creates purchase (POST /api/purchase)
Pending (square reserved, payment not yet received)
    │
    ├──▶ PayFast ITN succeeds → Confirmed (square assigned to owner)
    │
    └──▶ User cancels → Cancelled (square released back to available)
```

### Purchasing Rules

- Squares 1–4200 are purchasable (4200, not the full 4500)
- Each square costs R500
- Users can have maximum 3 concurrent pending purchases
- Squares already sold (`OwnerId != null`) cannot be purchased

---

## Map Subsystem

### Architecture (Frontend)

The interactive map is built with **Leaflet 1.9** and **OpenStreetMap** tile layers. The map renders a road overlay divided into 4500 individual 1m² square sections, each color-coded by construction status.

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| `MapComponent` | `components/map/` | Full-page interactive map with square selection |
| `RoadMapComponent` | `components/shared/road-map/` | Shared road map for embedded views (home, my-squares) |
| `MapLegendComponent` | `components/shared/map-legend/` | Color legend showing the 5 statuses |
| `BlockPickerModal` | `components/shared/block-picker-modal/` | Drag-to-select square picker for purchase flow |
| `ImageLightboxComponent` | `components/shared/image-lightbox/` | Lightbox viewer for progress images |

### Dependencies

- **leaflet** (npm) — interactive map library
- **@turf/turf** — geospatial utility for polygon/point operations (used in drag-to-select)
- **OpenStreetMap** tile server (free, no API key needed) — tile imagery

### Map Features

1. **Individual Square Selection** — Click any square on the map to select it. Squares are rendered as Leaflet polygons with status-based colors.
2. **Drag-to-Select** — Click and drag to draw a rectangle/area to select multiple squares at once. Uses Turf.js for geospatial intersection calculations.
3. **Status Visualization** — Each square is color-coded based on its `SquareStatus`:
   - `NogNieBeginNie` (0) — default/grey: Not started
   - `Voorberei` (1) — yellow/orange: Prepping
   - `BesigOmTeTeer` (2) — orange: Paving in progress
   - `KlaarGeteer` (3) — green: Completed
   - Sold squares show a distinct sold marker even before construction begins
4. **Progress Images** — Click a square with progress images to open a lightbox showing construction photos at each status stage.
5. **Responsive Layout** — Map adapts between desktop and mobile viewports.

### Data Flow

```
Backend: GET /api/road → All 4500 squares with Status + OwnerId
    │
    ▼
Frontend: RoadService.fetchSquares()
    │
    ▼
MapComponent: Renders squares as Leaflet GeoJSON/rectangle layers
    │
    ▼
User interaction (click/drag)
    │
    ▼
Selection stored in component state → passed to Payment flow
```

The full road grid is loaded once on page load. No real-time updates — the user refreshes to see new status changes.

---

## Authentication Subsystem

### Overview

Uses **ASP.NET Core Identity** with **JWT Bearer tokens** for API authentication and **HttpOnly cookies** for refresh tokens.

### Token Architecture

```
JWT Access Token (short-lived, 60 min default)
├── Claims: NameIdentifier, Email, GivenName, Surname, PhoneNumber,
│            IsOraniaResident, MustChangePassword, Role(s)
├── Signed: HMAC-SHA256 with Jwt:Key
├── Stored: In-memory on frontend (Angular service)
└── Sent: Authorization: Bearer header

Refresh Token (long-lived, 7 days default)
├── Generated: 64 random bytes, base64 encoded
├── Stored: RefreshTokens table in SQLite, HttpOnly cookie (refreshToken)
├── Cookie: HttpOnly=true, Secure=conditional, SameSite=Strict, Path=/api/auth
└── Renewed: On each refresh call (old revoked, new issued)
```

### Authentication Flow

```
1. POST /api/auth/register or /api/auth/login
   ├── Validates credentials + password policy + phone format
   ├── Issues JWT access token (in response body)
   ├── Creates refresh token in DB
   └── Sets refreshToken HttpOnly cookie

2. Auth Interceptor (Angular)
   ├── Attaches Authorization: Bearer {jwt} to all /api/ requests
   └── On 401 response:
       ├── Calls POST /api/auth/refresh (cookie sent automatically)
       ├── If success: retries original request with new token
       └── If fail: redirects to login

3. POST /api/auth/refresh
   ├── Reads refreshToken from HttpOnly cookie
   ├── Validates: exists, not revoked, not expired, user not anonymized
   ├── Revokes old refresh token (rotation)
   ├── Issues new JWT + new refresh token cookie

4. POST /api/auth/logout
   ├── Revokes refresh token from cookie
   └── Deletes cookie
```

### Security Features

| Feature | Implementation |
|---------|---------------|
| **Password Policy** | ASP.NET Core Identity: 8+ chars, digit, uppercase, lowercase, special character. Also enforced by custom `PasswordValidator`. |
| **Account Lockout** | 5 failed login attempts → 15-minute lockout. `LockoutOnFailure=true` on sign-in. |
| **Refresh Token Rotation** | Each refresh revokes the old token and issues a new one. Limits damage if a token is stolen. |
| **HttpOnly Refresh Cookies** | Refresh tokens are stored in HttpOnly cookies (inaccessible to JavaScript), preventing XSS token theft. |
| **SameSite Strict** | Refresh cookies use `SameSite=Strict`, preventing CSRF-based token theft. |
| **Secure Cookie** | `Secure` flag is set when the request is over HTTPS (production). |
| **Cookie Path Limitation** | Refresh cookie path is `/api/auth` — the browser only sends it to auth endpoints. |
| **MustChangePassword Flag** | Manual-purchase users are flagged with `MustChangePassword=true`. A middleware (`MustChangePasswordMiddleware`) blocks all API access (except logout, profile GET, and complete-password-change) until they change their password. |
| **Account Anonymization** | "Deleting" an account does not delete data; it anonymizes PII (email → `deleted-{id}@anonymized.invalid`, name → "Onaktiewe rekening", phone cleared, permanently locked out). Ownership records are preserved for data integrity. |
| **Admin Self-Delete Prevention** | Admin accounts cannot delete themselves. Only the seed admin can promote other users to admin. |
| **JWT Validation** | Validates issuer, audience, lifetime, and signing key on every request. |
| **Security Headers** | All responses include: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-XSS-Protection: 0`. |
| **HSTS** | Enabled in non-development environments. |
| **Forwarded Headers** | Configured for Azure App Service to trust X-Forwarded-For from known Azure IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16). This ensures correct client IP addresses for rate limiting and logging. |

### Password Reset with OTP

```
POST /api/auth/forgot-password
  ├── Generates 6-char alphanumeric OTP (ambiguous chars excluded: no I,O,0,1)
  ├── Hashes with SHA256, stores in PasswordResetOtps table (15-min expiry)
  ├── Invalidates any previous unused OTPs for this user
  └── Sends OTP via email (EmailOutboxService)

POST /api/auth/reset-password
  ├── Finds user's latest unused, unexpired OTP
  ├── Constant-time hash comparison (CryptographicOperations.FixedTimeEquals)
  ├── Marks OTP as used
  └── Resets password via UserManager
```

### Rate Limiting

Rate limits are implemented via ASP.NET Core's built-in `AddRateLimiter`. All limits are **fixed-window** with **IP-based** (or user-ID-based) keys.

| Policy Name | Applies To | Limit | Window | Key |
|-------------|-----------|-------|--------|-----|
| `auth` | `POST /api/auth/register`, `/login`, `/refresh`, `/complete-required-password-change` | 10 requests | 1 minute | Client IP |
| `reset-password` | `POST /api/auth/reset-password` | 30 requests | 1 minute | Client IP |
| `purchase` | `POST /api/purchase` | 10 requests | 1 minute | User ID (falls back to IP if unauthenticated) |
| `profile` | All `POST`/`PUT`/`DELETE` on `/api/profile` | 20 requests | 1 hour | User ID (falls back to IP) |

**Profile Change Rate Limit (additional):** The `ProfileRateLimitService` adds an additional, stricter limit on profile mutations:
- **3 changes per 12 hours** (rolling window, tracked in `ProfileChangeLogs` table)
- This is separate from the HTTP-level rate limit and applies across sessions
- Returns 429 with a message in Afrikaans when exceeded

**Response on rate limit:** HTTP 429 Too Many Requests.

---

## Admin Subsystem

### Role-Based Access Control

Two roles exist: `Admin` and `Buyer`. All new users are assigned `Buyer` by default.

Access control chain for admin routes:
1. `authGuard` — must be authenticated
2. `mustChangePasswordGuard` — must not have `MustChangePassword=true`
3. `adminGuard` — must have role `Admin`

### Admin Features

| Feature | Endpoint(s) | Description |
|---------|------------|-------------|
| **Bulk Status Update** | `PUT /api/admin/squares/status` | Advance multiple squares to the next status. Enforces sequential progression (can't skip statuses). Can't downgrade completed squares. |
| **Undo Last Save** | `GET/POST /api/admin/squares/undo-last` | Revert the last bulk status update. Stores snapshots of square statuses and owner IDs. Undo restores the previous state and deletes any progress images created in that batch. |
| **Manual Purchase** | `POST /api/admin/manual-purchase` | Create a purchase on behalf of someone (e.g., paid via EFT/cash). If the user doesn't exist, creates an account with a temporary password and sends a welcome email. Supports PDF proof-of-payment upload (max 10MB). |
| **Progress Images** | `GET/POST/PUT/DELETE /api/admin/squares/images` | Upload construction progress photos linked to specific squares at specific statuses. Supports JPEG, PNG, WebP (max 8MB). Handles conflict detection (square already has an image at this status) with optional replacement. |
| **Image Management** | `PUT/DELETE /api/admin/squares/images/{id}` | Replace or delete individual progress images. Orphan cleanup: if all square links are removed, the image file is deleted. |
| **Stats Dashboard** | `GET /api/admin/stats` | Comprehensive stats: progress %, total raised, sold count, daily sales chart, Orania resident vs outsider breakdown, Orania Beweging member breakdown, average spend per block, status distribution. |
| **Buyer Summary** | `GET /api/admin/purchases` | Aggregated view: per-user total squares owned and total spent, with contact details. |
| **Transaction List** | `GET /api/admin/transactions` | All purchases with user details, square counts, amounts, and payment status. |
| **Registered Users (No Purchase)** | `GET /api/admin/registered-no-purchase` | Users who registered but haven't bought any squares. Excludes admins and anonymized accounts. |
| **Promote to Admin** | `POST /api/admin/users/make-admin` | Promote a user to admin role. **Restricted to the seed admin only** (the user whose email matches `AdminUser:Email` in config). |
| **Site Settings** | `GET/PUT /api/admin/settings/home-stats` | Toggle visibility of the stats section and total raised amount on the public home page. |
| **Proof of Payment** | `GET/POST/DELETE /api/admin/purchases/{id}/proof` | Manage uploaded proof-of-payment PDFs for manual purchases. |
| **Diagnostics** | `GET /api/admin/diagnostics` | Check email configuration status, pending email outbox count, pending block notification count. |

### Audit Logging

All admin actions are logged to the `AdminAuditLogs` table:

```
AdminAuditLog
├── AdminUserId  (FK to Users)
├── Action       (e.g., "BulkStatusUpdate", "ManualPurchase", "MakeAdmin")
├── Details      (e.g., "Updated 50 squares to Voorberei")
└── CreatedAt
```

### Undo System

The admin undo system (`AdminSaveUndoService`) works as follows:

1. When admin makes a bulk status update, the system takes a **snapshot** of affected squares' current statuses and owner IDs.
2. Snapshots are grouped by `UndoBatchId` (generated on frontend).
3. If the admin uploads progress images in the same batch, they are linked to the undo snapshot.
4. **Undo** restores squares to their previous status/owner, and deletes any orphaned progress images.
5. Only one active undo batch per admin at a time — starting a new batch replaces the previous one.

### Pending Reservation Cleanup

`PendingReservationCleanupService` (runs every 90 seconds) automatically releases squares from pending purchases that haven't been paid within a timeout window. This prevents squares from being indefinitely reserved.

---

## Database Migration

### Current Setup: SQLite

The project ships with SQLite as the default database. EF Core migrations are committed in `src/DiamantLaan.Api/Migrations/`. On startup, `db.Database.MigrateAsync()` applies any pending migrations automatically.

The database file locations differ by environment:
- **Local dev:** `diamantlaan.db` in the project directory
- **Azure:** `/home/site/diamantlaan.db` (auto-detected via `WEBSITE_SITE_NAME` env var)

WAL journal mode is enabled on startup for better concurrent read/write performance.

### How to Migrate to MSSQL (SQL Server)

**Step 1: Install the EF Core SQL Server provider**

```bash
dotnet add src/DiamantLaan.Api package Microsoft.EntityFrameworkCore.SqlServer
```

**Step 2: Update `Program.cs`**

Replace:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));
```

With:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));
```

**Step 3: Remove the WAL journal pragma**

In `Program.cs`, remove or comment out:

```csharp
await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");
```

This is SQLite-specific.

**Step 4: Create new migrations**

```bash
# Remove old SQLite migrations
rm -rf src/DiamantLaan.Api/Migrations/

# Generate new SQL Server migrations
dotnet ef migrations add InitialCreate --project src/DiamantLaan.Api
```

**Step 5: Update the connection string**

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=DiamantLaan;Trusted_Connection=true;TrustServerCertificate=true"
}
```

**Step 6: Verify**

- The app starts and auto-applies migrations
- The 4500 squares and admin user are seeded
- All CRUD operations work as before

### How to Migrate to PostgreSQL

**Step 1: Install the EF Core PostgreSQL provider**

```bash
dotnet add src/DiamantLaan.Api package Npgsql.EntityFrameworkCore.PostgreSQL
```

**Step 2: Update `Program.cs`**

Replace the SQLite options with:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
```

**Step 3: Remove WAL pragma** (same as MSSQL step 3).

**Step 4: Create new migrations**

```bash
rm -rf src/DiamantLaan.Api/Migrations/
dotnet ef migrations add InitialCreate --project src/DiamantLaan.Api
```

**Step 5: Update the connection string**

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=diamantlaan;Username=postgres;Password=yourpassword"
}
```

**Step 6: Verify** (same as MSSQL step 6).

### Important Notes for Database Migration

- The `Square.RowVersion` property is configured with `IsRowVersion()` — SQL Server and PostgreSQL handle this natively. SQLite emulates it.
- The `SeedAsync` method inserts 4500 squares in a single `AddRange` call. For very large databases, consider using bulk insert.
- User file uploads (`uploads/` directory) are stored on the filesystem, not in the database. They are unaffected by database migration.
- The `AdminSaveSnapshot` stores JSON in `SquareStatusJson` and `OwnerIdsJson` columns — these are string columns, no special JSON column type needed.

---

## Deployment

The project deploys to Azure App Service via GitHub Actions (`.github/workflows/deploy.yml`):

- Trigger: push to `main`
- Build: `dotnet publish -c Release -o publish` (compiles Angular SPA into `wwwroot/`)
- Deploy: `azure/webapps-deploy@v3` to `diamantlaan-sb`

### Azure-specific Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `ConnectionStrings__DefaultConnection` | `Data Source=/home/site/diamantlaan.db` | Persistent DB on Azure's durable storage |
| `App__PublicUrl` | `https://diamantlaan-sb.azurewebsites.net` | Public URL for email links |

### Durable File Paths on Azure

| Path | Purpose |
|------|---------|
| `/home/site/diamantlaan.db` | SQLite database |
| `/home/site/backups/` | Automatic daily SQLite backups (last 7) |
| `/home/site/uploads/` | User uploads (proof of payment PDFs, progress images) |

The `SqliteBackupBackgroundService` creates daily backups of the SQLite database to `/home/site/backups/` and prunes backups older than 7 days.

### Production Health Check

```
GET /api/health
→ { "status": "ok", "emailConfigured": true }
```

```
GET /api/admin/diagnostics (admin only)
→ {
    "email": { "configured": true, "fromEmailSet": true, "apiKeySet": true, "pendingOutboxCount": 0 },
    "notifications": { "pendingBlockNotificationCount": 0 }
  }
```

## License

Private project — all rights reserved.
