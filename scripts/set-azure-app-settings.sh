#!/bin/bash
set -euo pipefail

# Reads local .NET user-secrets and pushes them to the Azure App Service.
# Also adds/overrides Azure-specific values that differ from local dev.

APP_NAME="diamantlaan-sb"
RESOURCE_GROUP="diamantlaan-rg"
API_PROJECT="src/DiamantLaan.Api/DiamantLaan.Api.csproj"

FRONTEND_BASE_URL="https://${APP_NAME}.azurewebsites.net/"
NOTIFY_URL="https://${APP_NAME}.azurewebsites.net/api/payment/itn"

echo "Reading local user-secrets from ${API_PROJECT}..."

settings=()

while IFS= read -r line; do
    # dotnet user-secrets list output format: "Key = Value"
    key="${line%% = *}"
    value="${line#* = }"
    value="${value# }"  # trim the single leading space the CLI adds

    # Convert nested JSON keys to Azure App Service double-underscore format.
    # e.g. "Jwt:Key" -> "Jwt__Key"
    az_key="${key//:/__}"

    settings+=("${az_key}=${value}")
done < <(dotnet user-secrets list --project "${API_PROJECT}")

# Add/override Azure-specific settings.
settings+=(
    "ConnectionStrings__DefaultConnection=Data Source=/home/site/diamantlaan.db"
    "App__PublicUrl=https://${APP_NAME}.azurewebsites.net"
    "PayFast__FrontendBaseUrl=${FRONTEND_BASE_URL}"
    "PayFast__NotifyUrl=${NOTIFY_URL}"
)

echo "Applying settings to Azure App Service: ${APP_NAME}..."
az webapp config appsettings set \
    --name "${APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --settings "${settings[@]}"

echo "Done."
