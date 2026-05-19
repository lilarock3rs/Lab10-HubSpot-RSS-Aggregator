const axios = require("axios");

const MAX_ITEMS_PER_FEED = 20;

exports.main = (context, sendResponse) => {
  runSync(context)
    .then((body) => sendResponse({ statusCode: 200, body }))
    .catch((err) => {
      console.error(err);
      sendResponse({
        statusCode: 500,
        body: { error: String(err.message || err) },
      });
    });
};

async function runSync() {
  const token = (process.env.HUBSPOT_PRIVATE_APP_TOKEN || "").trim();
  if (!token || token.length < 20) {
    throw new Error(
      "HUBSPOT_PRIVATE_APP_TOKEN missing or invalid. Run: hs secrets add HUBSPOT_PRIVATE_APP_TOKEN"
    );
  }

  const feedsTable = process.env.RSS_FEEDS_TABLE || "rss_feeds";
  const articlesTable = process.env.RSS_ARTICLES_TABLE || "rss_articles";

  const feeds = await getEnabledFeeds(token, feedsTable);
  const existingGuids = await getExistingGuids(token, articlesTable);

  let created = 0;
  let skipped = 0;

  for (const feed of feeds) {
    const items = await fetchFeedItems(feed.feed_url);
    const slice = items.slice(0, MAX_ITEMS_PER_FEED);

    for (const item of slice) {
      const guid = item.guid || item.link;
      if (!guid || existingGuids.has(guid)) {
        skipped++;
        continue;
      }
      await createArticleRow(token, articlesTable, {
        title: item.title,
        link: item.link,
        summary: item.summary,
        published_at: item.published_at,
        feed_name: feed.name,
        guid,
        image_url: item.image_url || "",
      });
      existingGuids.add(guid);
      created++;
    }

      try {
        await updateFeedSyncedAt(token, feedsTable, feed.id);
      } catch (err) {
        console.warn(`Could not update last_synced_at for feed ${feed.id}:`, err.message);
      }
    }

    await publishTable(token, articlesTable);
    try {
      await publishTable(token, feedsTable);
    } catch (err) {
      console.warn("Could not publish rss_feeds:", err.message);
    }

  return {
    ok: true,
    feedsProcessed: feeds.length,
    created,
    skipped,
  };
}

async function hubspotRequest(token, method, path, data) {
  const res = await axios({
    method,
    url: `https://api.hubapi.com${path}`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data,
    validateStatus: () => true,
  });
  if (res.status >= 400) {
    const msg =
      res.data?.message ||
      res.data?.error ||
      JSON.stringify(res.data) ||
      res.statusText ||
      `HTTP ${res.status}`;
    throw new Error(`${method.toUpperCase()} ${path} failed: ${msg}`);
  }
  return res.data;
}

async function getEnabledFeeds(token, tableName) {
  const data = await hubspotRequest(
    token,
    "get",
    `/cms/v3/hubdb/tables/${tableName}/rows?limit=100`
  );
  const rows = data.results || [];
  return rows
    .filter((r) => r.values?.enabled === 1 || r.values?.enabled === true)
    .map((r) => ({
      id: r.id,
      name: r.values?.name || "Feed",
      feed_url: r.values?.feed_url,
    }))
    .filter((f) => f.feed_url);
}

async function getExistingGuids(token, tableName) {
  const guids = new Set();
  let after;
  do {
    const path = after
      ? `/cms/v3/hubdb/tables/${tableName}/rows?limit=100&after=${after}`
      : `/cms/v3/hubdb/tables/${tableName}/rows?limit=100`;
    const data = await hubspotRequest(token, "get", path);
    for (const row of data.results || []) {
      const g = row.values?.guid;
      if (g) guids.add(String(g));
    }
    after = data.paging?.next?.after;
  } while (after);
  return guids;
}

async function createArticleRow(token, tableName, values) {
  await hubspotRequest(token, "post", `/cms/v3/hubdb/tables/${tableName}/rows`, {
    values,
  });
}

async function updateFeedSyncedAt(token, tableName, rowId) {
  await hubspotRequest(
    token,
    "patch",
    `/cms/v3/hubdb/tables/${tableName}/rows/${rowId}/draft`,
    { values: { last_synced_at: Date.now() } }
  );
}

async function publishTable(token, tableName) {
  await hubspotRequest(
    token,
    "post",
    `/cms/v3/hubdb/tables/${tableName}/draft/push-live`,
    {}
  );
}

async function fetchFeedItems(feedUrl) {
  const res = await axios.get(feedUrl, {
    headers: { "User-Agent": "HubSpot-RSS-Aggregator/1.0" },
    responseType: "text",
    timeout: 8000,
  });
  return parseRssOrAtom(res.data);
}

function parseRssOrAtom(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;

  for (const block of blocks) {
    const title = tagText(block, "title");
    const link =
      attrHref(block, "link") || tagText(block, "link") || tagText(block, "id");
    const guid = tagText(block, "guid") || tagText(block, "id") || link;
    const pub =
      tagText(block, "pubDate") ||
      tagText(block, "published") ||
      tagText(block, "updated");
    const summary =
      tagText(block, "description") ||
      tagText(block, "summary") ||
      tagText(block, "content");
    const enclosure = block.match(/url=["']([^"']+)["']/i);

    items.push({
      title: decodeEntities(stripTags(title || "Untitled")),
      link: (link || "").trim(),
      guid: (guid || link || "").trim(),
      summary: decodeEntities(stripTags(summary || "")).slice(0, 500),
      published_at: pub ? Date.parse(pub) || Date.now() : Date.now(),
      image_url: enclosure ? enclosure[1] : "",
    });
  }
  return items.filter((i) => i.link);
}

function tagText(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function attrHref(block, tag) {
  const re = new RegExp(`<${tag}[^>]*href=["']([^"']+)["']`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
