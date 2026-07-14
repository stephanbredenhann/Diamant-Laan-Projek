#!/bin/bash
set -euo pipefail

# Publish the API + Angular SPA, package it, and deploy to Azure App Service.

APP_NAME="diamantlaan-sb"
RESOURCE_GROUP="diamantlaan-rg"
API_PROJECT="src/DiamantLaan.Api/DiamantLaan.Api.csproj"
PUBLISH_DIR="publish"
ZIP_FILE="deploy.zip"

echo "Publishing ${API_PROJECT}..."
dotnet publish "${API_PROJECT}" -c Release -o "${PUBLISH_DIR}"

if [[ ! -f "${PUBLISH_DIR}/wwwroot/index.html" ]]; then
    echo "ERROR: Angular build did not produce ${PUBLISH_DIR}/wwwroot/index.html"
    exit 1
fi

echo "Packaging deployment archive..."
(
    cd "${PUBLISH_DIR}"
    rm -f "../${ZIP_FILE}"
    zip -r "../${ZIP_FILE}" . -x "web.config"
)

echo "Deploying to Azure App Service: ${APP_NAME}..."
# --clean false keeps files not in the zip (e.g. leftover under wwwroot during transitions).
# Durable uploads live under /home/site/uploads and are outside the deploy root.
az webapp deploy \
    --name "${APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --src-path "${ZIP_FILE}" \
    --type zip \
    --clean false

echo "Deployment complete."
echo "Verify with: curl -sI https://${APP_NAME}.azurewebsites.net/"
