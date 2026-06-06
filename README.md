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

The project is hosted on Azure App Service (F1 free tier). Deployment steps:

```bash
# Create resources (one-time)
az group create --name <group-name> --location westeurope
az appservice plan create --name <plan-name> -g <group-name> --sku F1 --is-linux
az webapp create --name <app-name> -g <group-name> --plan <plan-name> --runtime "DOTNETCORE|8.0"

# Set production secrets
az webapp config appsettings set --name <app-name> -g <group-name> \
  --settings \
    "Jwt__Key=<production-key>" \
    "AdminUser__Email=<admin-email>" \
    "AdminUser__Password=<admin-password>" \
    "ConnectionStrings__DefaultConnection=Data Source=/home/site/diamantlaan.db"



## License

Private project : all rights reserved.
