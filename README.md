# Community Road Paving Project

A crowdfunding platform that lets residents collectively fund the paving of a private road by purchasing individual 1m² sections. Buyers track paving progress in real time on an interactive map, while administrators manage construction status updates and project statistics. The project currently serves as a demo only.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | ASP.NET Core 8.0 Web API |
| Frontend | Angular 19.2 (standalone SPA) |
| Database | SQLite via Entity Framework Core 8.0 |
| Auth | ASP.NET Core Identity + JWT Bearer |
| Mapping | Leaflet 1.9 + OpenStreetMap |
| Hosting | Azure App Service (F1 free tier, Linux) |

## Features

- **Interactive map** : Select 1m² road sections by clicking or drag-to-select on an OpenStreetMap overlay
- **Progress tracking** : Each section transitions through 5 statuses: not started, sold, prepped, paving in progress, and completed
- **Real-time stats** : Live progress percentage and total funds raised
- **Role-based access** : Buyers purchase and track their sections; admins manage project status and view all statistics
- **Responsive design** : Desktop and mobile layouts styled with SCSS and CSS custom properties
- **Africaans UI** : Fully localized interface

## Project Structure

```
src/
├── DiamantLaan.Api/         # ASP.NET Core 8 Web API
│   ├── Controllers/         # Auth, Admin, Road, Purchase endpoints
│   ├── Data/                # EF Core DbContext + seed data
│   ├── Models/              # Entities, DTOs, Enums
│   └── Program.cs           # App entry point
└── DiamantLaan.Web/         # Angular 19 SPA
    └── src/app/
        ├── components/      # Home, Map, Login, Register, Payment, etc.
        ├── services/        # Auth, Road, Purchase services
        ├── guards/          # Auth and Admin route guards
        ├── interceptors/    # JWT token injection
        └── models/          # TypeScript interfaces
```

## Getting Started

### Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- Angular CLI (`npm install -g @angular/cli`)

### Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd "<repo-folder>"

# Set up user secrets for local development
dotnet user-secrets set --project src/DiamantLaan.Api "Jwt:Key" "your-development-key"
dotnet user-secrets set --project src/DiamantLaan.Api "AdminUser:Email" "admin@example.com"
dotnet user-secrets set --project src/DiamantLaan.Api "AdminUser:Password" "YourPassword123!"
dotnet user-secrets set --project src/DiamantLaan.Api "Resend:ApiKey" "re_your_api_key"
dotnet user-secrets set --project src/DiamantLaan.Api "Resend:FromEmail" "noreply@yourdomain.com"

# Install Angular dependencies
cd src/DiamantLaan.Web
npm install

# Run API (terminal 1)
cd ../..
dotnet run --project src/DiamantLaan.Api

# Run Angular dev server (terminal 2)
cd src/DiamantLaan.Web
ng serve
```

- API: `http://localhost:5000` (Swagger at `/swagger`)
- Frontend: `http://localhost:4200` (proxies API requests)

### Production Build

```bash
dotnet publish src/DiamantLaan.Api/DiamantLaan.Api.csproj -c Release -o publish
```

This compiles the Angular SPA and bundles it into the API's `wwwroot/`, producing a self-contained deployment in the `publish/` directory.

## Deployment

Hosted on Azure App Service (`diamantlaan-sb`, F1 Linux). Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): `dotnet publish` then zip-deploy via the publish profile.

### One-time setup

1. **GitHub secret** — Azure Portal → App Service → *Get publish profile* → paste the full XML into repo secret `AZURE_WEBAPP_PUBLISH_PROFILE`.
2. **App Settings** — keep secrets and the Azure DB path on the web app (not in git). From a machine that has your user-secrets:

```bash
./scripts/set-azure-app-settings.sh
```

Or set manually, including:

```text
ConnectionStrings__DefaultConnection=Data Source=/home/site/diamantlaan.db
App__PublicUrl=https://diamantlaan-sb.azurewebsites.net
```

Local development keeps `appsettings.json` (`Data Source=diamantlaan.db`) and `dotnet user-secrets`. Azure App Settings override those values only on App Service.

### Migrations

EF migrations under `src/DiamantLaan.Api/Migrations/` are committed and shipped in the publish output. On startup, `MigrateAsync()` applies pending migrations to **that environment’s** SQLite file (local PC and Azure are separate databases). Feature branches only affect Azure after you merge/push `main`.

### Durable files on Azure

| Path | Purpose |
|------|---------|
| `/home/site/diamantlaan.db` | SQLite database |
| `/home/site/backups/` | Automatic daily backups (last 7) |
| `/home/site/uploads/` | User uploads (proofs, progress images) — survives redeploys |

SPA build output under `/home/site/wwwroot` is replaced each deploy. Local uploads stay in `App_Data/uploads/`.

If an older deploy already stored files under `/home/site/wwwroot/App_Data/uploads/`, copy them once to `/home/site/uploads/` (Kudu/SSH). The API also falls back to the old path when resolving existing files.

### Manual deploy fallback

```bash
./scripts/deploy.sh
```

Uses `az webapp deploy --clean false` (same publish package as CI).

### New App Service (optional)

```bash
az group create --name <group-name> --location westeurope
az appservice plan create --name <plan-name> -g <group-name> --sku F1 --is-linux
az webapp create --name <app-name> -g <group-name> --plan <plan-name> --runtime "DOTNETCORE|8.0"
```

Verify your sender domain in the [Resend dashboard](https://resend.com/domains) before going live. Check email health at `GET /api/health` (public) or `GET /api/admin/diagnostics` (admin).

## License

Private project : all rights reserved.
