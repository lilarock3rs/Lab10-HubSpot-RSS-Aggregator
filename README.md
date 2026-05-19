# Lab 10 — HubSpot RSS Aggregator (Skill + MCP)

Repositorio: https://github.com/lilarock3rs/Lab10-HubSpot-RSS-Aggregator

Agregador RSS → HubDB → módulo CMS HubL, orquestado por la skill `hubspot-rss-hubdb-aggregator` y MCP **HubSpotDev**.

## Decisiones (MVP)

- Módulo: **HubL**
- Alcance: **2 feeds demo**, sync **manual** (POST al serverless)
- HubDB: **`hs hubdb create`** (no hay tool MCP para tablas)

## Prerrequisitos

1. `npm install -g @hubspot/cli` y `hs auth`
2. MCP HubSpotDev en Cursor (`hs mcp setup --client cursor`)
3. Portal con **CMS + HubDB** (cuenta `integrations-mvp` en este repo)

## Estructura

```
.cursor/skills/hubspot-rss-hubdb-aggregator/
hubdb/rss_feeds.json          # CLI: crear tabla + 2 feeds demo
hubdb/rss_articles.json       # CLI: crear tabla vacía
cms/sync-rss.functions/
cms/rss-feed-list.module/
scripts/create-hubdb-tables.sh
```

## Setup

### 1. Crear tablas HubDB (CLI)

```bash
cd /Users/lilarock3rs/Documents/Lab10_CrearSkillAndMCP
./scripts/create-hubdb-tables.sh
```

Tablas creadas en portal `47232509`:

| Name | Table ID |
|------|----------|
| rss_feeds | 294548351 |
| rss_articles | 294681971 |

**Publicar** en [HubDB](https://app.hubspot.com/hubdb/47232509): abre cada tabla → **Publish**.

### 2. Secret para serverless

Private App con scopes HubDB read/write. Luego:

```bash
hs secrets add HUBSPOT_PRIVATE_APP_TOKEN
```

### 3. Subir CMS

Ruta en Design Manager: `rss-aggregator/`

```bash
hs cms upload cms/rss-feed-list.module rss-aggregator/modules/rss-feed-list.module
hs cms upload cms/sync-rss.functions rss-aggregator/sync-rss.functions
```

### 4. Sincronizar RSS

Dominio CMS de este portal:

`https://integrations-47232509.hubspotpagebuilder.com`

Design Manager usa `/_hcms/api/` (no `/hs/serverless/`):

```bash
curl -X POST "https://integrations-47232509.hubspotpagebuilder.com/_hcms/api/sync-rss?portalid=47232509" \
  -H "Content-Type: application/json"
```

Vuelve a **publicar** `rss_articles` si el sync escribe en draft.

### 5. Landing

Añade el módulo **RSS Feed List** (`table_name` = `rss_articles`) a una página.

## MCP vs CLI

| Tarea | Herramienta |
|-------|-------------|
| Docs HubDB/serverless | MCP `search-docs` + `fetch-doc` |
| Crear tablas HubDB | **`hs hubdb create`** |
| Módulo + serverless | MCP `create-cms-module`, `create-cms-function` (o archivos en `cms/`) |
| Filas RSS tras sync | Serverless `sync-rss` → HubDB API |

## Skill

```
Usa hubspot-rss-hubdb-aggregator y crea las tablas HubDB con el CLI.
```

Ver `.cursor/skills/hubspot-rss-hubdb-aggregator/examples.md`.

## Checklist lab

- [x] Skill en `.cursor/skills/`
- [x] Tablas HubDB creadas (`rss_feeds`, `rss_articles`)
- [x] Serverless desplegado + secret configurado
- [x] Sync manual OK
- [x] Código en GitHub
- [ ] Módulo en landing publicada (UI HubSpot)
