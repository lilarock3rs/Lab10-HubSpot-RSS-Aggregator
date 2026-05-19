---
name: hubspot-rss-hubdb-aggregator
description: >-
  Builds and maintains a HubSpot RSS-to-HubDB-to-CMS workflow using HubSpotDev MCP
  and local code. Creates HubDB tables (rss_feeds, rss_articles), CMS serverless
  sync-rss, and HubL module rss-feed-list. Use when the user mentions RSS, feeds,
  HubDB, sync articles, hubspot-rss, or CMS news aggregator.
---

# HubSpot RSS → HubDB → CMS

## Prerequisites

- HubSpot CLI authenticated: `hs auth`
- MCP server **HubSpotDev** enabled in Cursor
- Portal with **CMS + HubDB** (Professional/Enterprise)
- Project root: use `absoluteCurrentWorkingDirectory` = workspace absolute path

## Workflow (follow in order)

### 1. Documentation (MCP — always first)

Call `search-docs` then `fetch-doc` for:

- HubDB API (create table, rows, publish)
- CMS serverless functions (overview + getting started)

Do not guess API shapes; use fetched docs.

### 2. HubDB tables (CLI — not an MCP tool)

**MCP does not create HubDB tables.** Use HubSpot CLI after `fetch-doc` on HubDB CLI commands:

```bash
./scripts/create-hubdb-tables.sh
# or:
hs hubdb create --path hubdb/rss_feeds.json
hs hubdb create --path hubdb/rss_articles.json
```

Source files: `hubdb/rss_feeds.json` (includes 2 demo feed rows), `hubdb/rss_articles.json` (empty).

| Table | Purpose |
|-------|---------|
| `rss_feeds` | Sources: name, feed_url, enabled, last_synced_at |
| `rss_articles` | Items: title, link, summary, published_at, feed_name, guid, image_url |

Column definitions: see [reference.md](reference.md). Legacy `*.schema.json` files are reference-only.

**Publish** both tables in HubSpot UI (Content > HubDB > Publish) so the live site and module see data.

### 3. CMS serverless (MCP scaffold + code)

Call MCP `create-cms-function` with:

- `functionsFolder`: `sync-rss`
- `filename`: `sync-rss.js`
- `endpointMethod`: `POST`
- `endpointPath`: `/sync-rss`
- `dest`: `{workspace}/cms/sync-rss.functions`

Implement logic in generated file (see `cms/sync-rss.functions/` in repo):

- Read enabled feeds from HubDB `rss_feeds`
- Fetch and parse each RSS URL
- Upsert into `rss_articles` (dedupe by `guid` or `link`)
- Max 20 items per feed per run
- Publish `rss_articles` when done
- Use `HUBSPOT_PRIVATE_APP_TOKEN` from HubSpot secrets

**Do not** call `upload-project` unless the user explicitly requests deploy.

### 4. CMS module (MCP scaffold + HubL)

Call MCP `create-cms-module` with:

- `userSuppliedName`: `rss-feed-list` (ask if unclear)
- `reactType`: `false` (HubL)
- `moduleLabel`: `RSS Feed List`
- `contentTypes`: `SITE_PAGE,LANDING_PAGE`
- `dest`: `{workspace}/cms/rss-feed-list.module`

Edit `module.html` to use `hubdb_table_rows()` — see repo template.

### 5. Validate (MVP)

1. User adds feed rows in `rss_feeds` (enabled = true)
2. `POST` to `https://{domain}/hs/serverless/.../sync-rss`
3. Confirm rows in `rss_articles` (published)
4. Add module to a landing page; preview

Debug failures: MCP `get-cms-serverless-function-logs`.

## MCP rules

| Rule | Action |
|------|--------|
| Names | Never invent `userSuppliedName`; ask user |
| Upload/deploy | Ask before `upload-project` or `deploy-project` |
| Docs | `search-docs` → `fetch-doc` before HubDB/serverless API work |
| Paths | Pass full absolute paths to MCP tools |

## Out of scope (MVP)

- Automatic cron (document manual POST or future GitHub Actions)
- React modules
- CRM sync

## Repo layout

```
.cursor/skills/hubspot-rss-hubdb-aggregator/
hubdb/*.schema.json
cms/sync-rss.functions/
cms/rss-feed-list.module/
scripts/seed-feeds.example.json
README.md
```

## Examples

See [examples.md](examples.md).
