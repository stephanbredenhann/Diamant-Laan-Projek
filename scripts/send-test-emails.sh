#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
dotnet run --project scripts/SendTestEmails -- "$@"
