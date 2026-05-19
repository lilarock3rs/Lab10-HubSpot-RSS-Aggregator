# Example prompts

## Bootstrap

```
Usa la skill hubspot-rss-hubdb-aggregator. Configura el agregador RSS desde cero
en este workspace: tablas HubDB, serverless sync-rss y módulo rss-feed-list (HubL).
Consulta la doc con MCP antes de implementar.
```

## Add a feed

```
Añade el feed https://example.com/rss.xml a rss_feeds (nombre: Example Blog)
y dime cómo ejecutar sync-rss.
```

## Sync and verify

```
Sincroniza los RSS activos. Si falla, revisa logs del serverless con MCP.
```

## Module only

```
Crea el módulo rss-feed-list para mostrar las últimas 10 noticias de rss_articles.
```

## Deploy (explicit)

```
Sube el proyecto CMS a HubSpot (upload). Pide confirmación antes.
```
