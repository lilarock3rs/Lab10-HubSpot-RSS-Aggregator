#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACCOUNT="${HS_ACCOUNT:-integrations-mvp}"

echo "Creating HubDB tables in account: ${ACCOUNT}"

hs hubdb create --path "${ROOT}/hubdb/rss_feeds.json" --account "${ACCOUNT}"
hs hubdb create --path "${ROOT}/hubdb/rss_articles.json" --account "${ACCOUNT}"

echo ""
echo "Done. Publish tables in HubSpot: Content > HubDB > each table > Publish"
echo "Or run sync after serverless is deployed."
