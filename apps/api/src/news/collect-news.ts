import { createHash } from "node:crypto";
import type { NewsCategory, TechNewsItem } from "@programeint/shared";
import { TECH_NEWS_FEEDS, TRUSTED_NEWS_HOSTS } from "./news-feeds";

type RawItem = {
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  sourceHint: string | null;
  imageUrl: string | null;
};

const UA = "ProgrameintNews/1.0 (+https://programeint.local; tech learning platform)";

const CLICKBAIT =
  /\b(you won'?t believe|shocking|gone viral|this one trick|unbelievable|click here)\b/i;

/** Tem de parecer programação / tecnologia / actualização técnica. */
const CORE_SIGNAL =
  /\b(programming|programmer|developer|software|engineer|engineering|open[- ]?source|source code|github|gitlab|stackoverflow|api|sdk|framework|library|runtime|compiler|javascript|typescript|python|java|kotlin|rust|golang|go\b|c\+\+|ruby|php|swift|react|next\.?js|node\.?js|docker|kubernetes|linux|database|sql|devops|cloud|aws|azure|gcp|vscode|ide|commit|pull request|release|version|update|changelog|patch|CVE|vulnerability|cyber|security|artificial intelligence|machine learning|llm|gpt|openai|anthropic|deepmind|nvidia|gpu|cpu|chip|semiconductor|tsmc|processor|hardware|tecnologia|programa[cç][aã]o|desenvolvedor|c[oó]digo|intelig[eê]ncia artificial|actualiza[cç][aã]o|atualiza[cç][aã]o|lan[cç]amento)\b/i;

/** Fora de âmbito: lifestyle, gadgets de consumo, auto, entretenimento, etc. */
const OFFTOPIC =
  /\b(headphones?|earbuds?|speaker|sonos|streaming show|netflix|disney\+|celebrity|fashion|beauty|recipe|cargo ship|hydrogen fuel|automobile|electric scooter|smartphone deal|black friday|gaming console exclusive|hollywood|spotify|tiktok|cybertruck|tesla|\blucid\b|undrivable|vehicle recall|fire hazard|smart home|financial news|stock market tip|overclocking|mvolt)\b/i;

/** Sinal forte: programação, software, IA técnica ou actualização de plataforma. */
const STRONG_SIGNAL =
  /\b(programming|programmer|developer|software|open[- ]?source|github|gitlab|api|sdk|framework|library|runtime|compiler|javascript|typescript|python|java|kotlin|rust|golang|react|node\.?js|docker|kubernetes|linux|database|devops|vscode|pull request|release|version|update|changelog|patch|CVE|vulnerability|llm|gpt|openai|anthropic|machine learning|model weights|inference|cuda|gpu driver|semiconductor|programa[cç]|desenvolvedor|c[oó]digo|actualiza|atualiza|lan[cç]amento)\b/i;

function stripTags(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata?.[1]) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plain?.[1]?.trim() ?? "";
}

function extractLink(block: string): string {
  const atom = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (atom?.[1]) return atom[1].trim();
  const rss = extractTag(block, "link");
  if (rss) return stripTags(rss);
  const guid = extractTag(block, "guid");
  if (guid.startsWith("http")) return stripTags(guid);
  return "";
}

function extractImage(block: string): string | null {
  const mediaContent = block.match(
    /<media:content[^>]+url=["']([^"']+)["'][^>]*(?:medium=["']image["'])?[^>]*\/?>/i,
  );
  if (mediaContent?.[1] && isImageUrl(mediaContent[1])) return absoluteUrl(mediaContent[1]);

  const mediaThumb = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*\/?>/i);
  if (mediaThumb?.[1]) return absoluteUrl(mediaThumb[1]);

  const enclosure = block.match(
    /<enclosure[^>]+(?:type=["']image\/[^"']+["'][^>]+url=["']([^"']+)["']|url=["']([^"']+)["'][^>]+type=["']image\/[^"']+["'])/i,
  );
  const encUrl = enclosure?.[1] || enclosure?.[2];
  if (encUrl) return absoluteUrl(encUrl);

  const img = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img?.[1] && isImageUrl(img[1])) return absoluteUrl(img[1]);

  return null;
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url) || /\/image|img|photo|thumb|media/i.test(url);
}

function absoluteUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

function parseFeed(xml: string): RawItem[] {
  const chunks =
    xml.match(/<item[\s\S]*?<\/item>/gi) ??
    xml.match(/<entry[\s\S]*?<\/entry>/gi) ??
    [];
  const items: RawItem[] = [];
  for (const block of chunks) {
    const title = stripTags(extractTag(block, "title"));
    const link = extractLink(block);
    if (!title || !link) continue;
    const rawDesc =
      extractTag(block, "description") ||
      extractTag(block, "summary") ||
      extractTag(block, "content") ||
      extractTag(block, "content:encoded") ||
      title;
    const summary = stripTags(rawDesc);
    const publishedRaw =
      extractTag(block, "pubDate") ||
      extractTag(block, "published") ||
      extractTag(block, "updated") ||
      extractTag(block, "dc:date");
    let publishedAt: string | null = null;
    if (publishedRaw) {
      const d = new Date(stripTags(publishedRaw));
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    const sourceHint =
      stripTags(extractTag(block, "source")) ||
      stripTags(extractTag(block, "dc:creator")) ||
      null;
    items.push({
      title,
      link,
      summary: summary.slice(0, 420),
      publishedAt,
      sourceHint,
      imageUrl: extractImage(block) ?? extractImage(rawDesc),
    });
  }
  return items;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isTrustedHost(host: string | null): boolean {
  if (!host) return false;
  return TRUSTED_NEWS_HOSTS.some((trusted) => host === trusted || host.endsWith(`.${trusted}`));
}

function splitGoogleTitle(title: string): { title: string; source: string | null } {
  const parts = title.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    const source = parts.pop()!.trim();
    return { title: parts.join(" - ").trim(), source };
  }
  return { title, source: null };
}

function categorize(title: string, summary: string): Exclude<NewsCategory, "all"> {
  const text = `${title} ${summary}`;
  if (/\b(ai|a\.i\.|artificial intelligence|machine learning|llm|gpt|openai|anthropic|deepmind|intelig[eê]ncia artificial|modelo generativo)\b/i.test(text)) {
    return "ai";
  }
  if (/\b(programming|programmer|developer|javascript|typescript|python|java|rust|golang|react|node|github|open[- ]?source|framework|sdk|api|programa[cç]|desenvolvedor|c[oó]digo)\b/i.test(text)) {
    return "programming";
  }
  if (/\b(release|version|update|changelog|patch|launch|lan[cç]amento|actualiza|atualiza|GA\b|beta)\b/i.test(text)) {
    return "updates";
  }
  return "tech";
}

function relevanceScore(title: string, summary: string): number {
  const text = `${title} ${summary}`;
  let score = 0;
  if (/\b(programming|developer|software|open[- ]?source|github|framework|api|sdk|javascript|typescript|python|java|rust)\b/i.test(text)) {
    score += 3;
  }
  if (/\b(release|update|version|patch|changelog|lan[cç]amento)\b/i.test(text)) score += 2;
  if (/\b(ai|llm|machine learning|gpt)\b/i.test(text)) score += 2;
  if (/\b(chip|gpu|cpu|semiconductor|processor)\b/i.test(text)) score += 1;
  return score;
}

function toItem(raw: RawItem, feedLabel: string): TechNewsItem | null {
  let title = raw.title;
  let source = feedLabel;
  const host = hostOf(raw.link);

  if (host?.includes("news.google.")) {
    const split = splitGoogleTitle(raw.title);
    title = split.title;
    if (split.source) source = split.source;
  }

  const blob = `${title} ${raw.summary}`;
  if (CLICKBAIT.test(title)) return null;
  if (OFFTOPIC.test(blob)) return null;
  if (!CORE_SIGNAL.test(blob) || !STRONG_SIGNAL.test(blob)) return null;

  const googleish = Boolean(host?.includes("news.google."));
  // HN aponta para muitos hosts — aceitar se o sinal técnico for forte
  const hn = feedLabel === "Hacker News";
  if (!googleish && !hn && !isTrustedHost(host)) return null;
  if (googleish) {
    const publisherOk = TRUSTED_NEWS_HOSTS.some((h) => {
      const tip = h.split(".")[0]!;
      return tip.length > 3 && source.toLowerCase().includes(tip);
    });
    const knownNames =
      /bbc|reuters|ars technica|register|mit|infoq|github|stackoverflow|zdnet|wired|techcrunch|verge|tecnoblog|canaltech|tecmundo|olhar digital/i;
    if (!publisherOk && !knownNames.test(source)) return null;
  }

  const id = createHash("sha1").update(raw.link).digest("hex").slice(0, 16);
  return {
    id,
    title,
    summary: raw.summary || title,
    url: raw.link,
    source: hn ? "Hacker News" : source,
    sourceHost: host ?? "unknown",
    searchEngine: feedLabel,
    publishedAt: raw.publishedAt,
    category: categorize(title, raw.summary),
    imageUrl: raw.imageUrl,
  };
}

async function fetchFeed(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function collectTechNews(): Promise<TechNewsItem[]> {
  const settled = await Promise.all(
    TECH_NEWS_FEEDS.map(async (feed) => {
      const xml = await fetchFeed(feed.url);
      if (!xml) return [] as TechNewsItem[];
      return parseFeed(xml)
        .map((raw) => toItem(raw, feed.label))
        .filter((item): item is TechNewsItem => Boolean(item));
    }),
  );

  const byUrl = new Map<string, TechNewsItem>();
  for (const item of settled.flat()) {
    const key = item.url.split("&")[0]!;
    const prev = byUrl.get(key);
    if (!prev) {
      byUrl.set(key, item);
      continue;
    }
    const prevTime = prev.publishedAt ? Date.parse(prev.publishedAt) : 0;
    const nextTime = item.publishedAt ? Date.parse(item.publishedAt) : 0;
    const richer = Boolean(item.imageUrl) && !prev.imageUrl;
    if (nextTime > prevTime || (nextTime === prevTime && richer)) byUrl.set(key, item);
  }

  return [...byUrl.values()].sort((a, b) => {
    const scoreDiff =
      relevanceScore(b.title, b.summary) - relevanceScore(a.title, a.summary);
    if (scoreDiff !== 0) return scoreDiff;
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
}

export function listNewsSearchEngines() {
  return TECH_NEWS_FEEDS.map((feed) => ({
    id: feed.id,
    label: feed.label,
    kind: feed.url.includes("news.google.com") ? ("google-news" as const) : ("rss" as const),
  }));
}
