# Reference: HubDB + Serverless

## Table `rss_feeds`

| Column | Type | Notes |
|--------|------|-------|
| name | TEXT | Display name |
| feed_url | TEXT | RSS/Atom URL |
| enabled | BOOLEAN | Only sync when true |
| last_synced_at | DATETIME | Updated after successful sync |

## Table `rss_articles`

| Column | Type | Notes |
|--------|------|-------|
| title | TEXT | Required |
| link | TEXT | Dedup fallback |
| summary | TEXT | Strip HTML in sync |
| published_at | DATETIME | Sort desc in module |
| feed_name | TEXT | From rss_feeds.name |
| guid | TEXT | Primary dedup key |
| image_url | TEXT | Optional |

## HubDB API (draft rows)

- Create row: `POST /cms/v3/hubdb/tables/{tableName}/rows`
- Batch create: `POST .../rows/draft/batch/create` (max 100)
- Publish table: `POST /cms/v3/hubdb/tables/{tableName}/draft/push-live`
- List rows: `GET /cms/v3/hubdb/tables/{tableName}/rows`

Use column **names** in `values`, not internal column IDs.

Example row body:

```json
{
  "values": {
    "title": "Article title",
    "link": "https://example.com/post",
    "guid": "https://example.com/post",
    "feed_name": "HubSpot Blog",
    "published_at": 1716000000000,
    "summary": "Short description"
  }
}
```

## Scopes (Private App)

Typical scopes for sync function:

- `cms.hubdb.read`
- `cms.hubdb.write`
- (or legacy `content` scopes per your portal)

Store token as secret `HUBSPOT_PRIVATE_APP_TOKEN` in the CMS account.

## Serverless endpoint (Design Manager)

Public URL pattern:

`https://{your-domain}/_hcms/api/sync-rss?portalid={hubId}`

Example for this lab:

```bash
curl -X POST "https://integrations-47232509.hubspotpagebuilder.com/_hcms/api/sync-rss?portalid=47232509" \
  -H "Content-Type: application/json"
```

Project-based functions use `/hs/serverless/` instead; this repo uses Design Manager upload.

## Module HubL

```hubl
{% set query = "&orderBy=-published_at&limit=" ~ module.limit %}
{% set rows = hubdb_table_rows(module.table_name, query) %}
```

Table must be **published** for live pages.
