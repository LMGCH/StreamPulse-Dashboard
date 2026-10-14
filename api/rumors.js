const FEED_KEYS = ['GOOGLE_ALERTS_RSS_1', 'GOOGLE_ALERTS_RSS_2', 'GOOGLE_ALERTS_RSS_3', 'GOOGLE_ALERTS_RSS_4', 'GOOGLE_ALERTS_RSS_5'];
const MAX_ITEMS_PER_FEED = 40;

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .trim();
}

function tagValue(xml, tagNames) {
  for (const tag of tagNames) {
    const match = xml.match(new RegExp(`<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${tag}\\s*>`, 'i'));
    if (match) return decodeXml(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  }
  return '';
}

function entryLink(entry) {
  const links = [...entry.matchAll(/<(?:[\w.-]+:)?link\b([^>]*)\/?\s*>/gi)];
  for (const match of links) {
    const attrs = match[1];
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href && (!rel || rel === 'alternate')) return decodeXml(href);
  }
  return '';
}

function classify(title, summary) {
  const text = `${title} ${summary}`.toLocaleLowerCase();
  if (/(official announcement|officially announced|\bconfirmed\b|confirmad[oa]s?\b|anuncio oficial|announced by|world premiere|release date revealed)/i.test(text)) {
    return 'Confirmación / anuncio';
  }
  if (/(leak|leaked|filtraci[oó]n|filtrado|datamine|datamined|early footage)/i.test(text)) {
    return 'Filtración';
  }
  if (/(rumou?r|reportedly|report says|according to|secuela|sin anunciar|unannounced|speculation|rumor|rumor|posible|podr[ií]a)/i.test(text)) {
    return 'Rumor';
  }
  if (/(release date|launch window|fecha de lanzamiento|retraso|delay|delayed|release window)/i.test(text)) {
    return 'Fecha / lanzamiento';
  }
  return 'Novedad';
}

function parseFeed(xml, feedUrl, feedIndex) {
  const feedTitle = tagValue(xml, ['title']) || `Google Alerts ${feedIndex + 1}`;
  const entries = [...xml.matchAll(/<(?:[\w.-]+:)?entry\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?entry\s*>/gi)]
    .slice(0, MAX_ITEMS_PER_FEED)
    .map((match) => {
      const entry = match[1];
      const title = tagValue(entry, ['title']);
      const link = entryLink(entry);
      const published = tagValue(entry, ['published', 'updated', 'pubDate', 'date']);
      const summary = tagValue(entry, ['summary', 'content', 'description']);
      if (!title || !link || !/^https?:\/\//i.test(link)) return null;
      const date = published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : null;
      return {
        id: `${link}|${title}`.slice(0, 500),
        title,
        url: link,
        publishedAt: date,
        summary: summary.slice(0, 700),
        source: feedTitle,
        alert: feedTitle,
        type: classify(title, summary),
      };
    })
    .filter(Boolean);
  return { feedUrl, feedTitle, entries };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const feeds = FEED_KEYS.map((key, index) => ({ key, url: process.env[key], index }))
    .filter((feed) => Boolean(feed.url && feed.url.trim()));

  if (feeds.length === 0) {
    return res.status(503).json({
      error: 'Los feeds de Google Alerts todavía no están configurados en el servidor.',
      hint: 'Configura GOOGLE_ALERTS_RSS_1 a GOOGLE_ALERTS_RSS_5 como variables de entorno.',
      configuredFeeds: 0,
      items: [],
    });
  }

  const results = await Promise.allSettled(feeds.map(async (feed) => {
    const response = await fetch(feed.url, {
      headers: { 'User-Agent': 'StreamPulse/1.0 (+Google Alerts Atom reader)', Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8' },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) throw new Error(`Feed ${feed.index + 1}: HTTP ${response.status}`);
    const xml = await response.text();
    if (!/<(?:[\w.-]+:)?feed\b|<(?:[\w.-]+:)?rss\b|<(?:[\w.-]+:)?RDF\b/i.test(xml)) {
      throw new Error(`Feed ${feed.index + 1}: respuesta no reconocida como RSS/Atom`);
    }
    return parseFeed(xml, feed.url, feed.index);
  }));

  const feedsStatus = results.map((result, index) => ({
    feed: feeds[index].index + 1,
    ok: result.status === 'fulfilled',
    count: result.status === 'fulfilled' ? result.value.entries.length : 0,
  }));

  const allItems = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value.entries);

  const unique = new Map();
  for (const item of allItems) {
    const key = item.url.replace(/#.*$/, '').replace(/\/$/, '').toLocaleLowerCase();
    const previous = unique.get(key);
    if (!previous || (item.summary && !previous.summary)) unique.set(key, item);
  }

  const items = [...unique.values()]
    .sort((a, b) => (Date.parse(b.publishedAt || '') || 0) - (Date.parse(a.publishedAt || '') || 0))
    .slice(0, 100);

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  return res.status(200).json({
    source: 'Google Alerts RSS/Atom',
    fetchedAt: new Date().toISOString(),
    configuredFeeds: feeds.length,
    successfulFeeds: feedsStatus.filter((feed) => feed.ok).length,
    total: items.length,
    feeds: feedsStatus,
    items,
    warning: results.some((result) => result.status === 'rejected')
      ? 'Al menos un feed no ha podido consultarse. Se muestran los resultados disponibles.'
      : null,
  });
}
