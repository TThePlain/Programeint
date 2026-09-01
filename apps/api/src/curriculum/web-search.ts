/**
 * Pesquisa web + YouTube para alimentar geração de mapa/vídeos.
 * Sem chaves pagas usa DuckDuckGo / Wikipedia; com YOUTUBE_API_KEY usa Data API v3.
 */

export type WebHit = { title: string; snippet: string; url?: string; imageUrl?: string };

export type YoutubeHit = {
  youtubeId: string;
  title: string;
  channel: string;
  /** Thumbnail oficial do YouTube (CDN). */
  thumbnailUrl?: string;
  /** Se o resultado pertence a uma playlist (preferir série completa). */
  playlistId?: string;
};

const YT_ID = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/;

export async function searchWeb(query: string, limit = 5): Promise<WebHit[]> {
  const hits: WebHit[] = [];

  try {
    const wiki = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json`,
      { signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "ProgrameintCurriculum/1.0" } },
    );
    if (wiki.ok) {
      const data = (await wiki.json()) as [string, string[], string[], string[]];
      const titles = data[1] ?? [];
      const descs = data[2] ?? [];
      const urls = data[3] ?? [];
      for (let i = 0; i < titles.length; i += 1) {
        const title = titles[i];
        if (!title) continue;
        hits.push({
          title,
          snippet: descs[i] || title,
          url: urls[i],
        });
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const ddg = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "ProgrameintCurriculum/1.0" } },
    );
    if (ddg.ok) {
      const data = (await ddg.json()) as {
        AbstractText?: string;
        Heading?: string;
        AbstractURL?: string;
        Image?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string } | { Topics?: unknown }>;
      };
      if (data.AbstractText) {
        hits.push({
          title: data.Heading || query,
          snippet: data.AbstractText.slice(0, 280),
          url: data.AbstractURL,
          imageUrl: absoluteImageUrl(data.Image),
        });
      }
      for (const topic of data.RelatedTopics ?? []) {
        if ("Text" in topic && topic.Text) {
          hits.push({ title: topic.Text.slice(0, 80), snippet: topic.Text.slice(0, 220), url: topic.FirstURL });
        }
        if (hits.length >= limit) break;
      }
    }
  } catch {
    /* ignore */
  }

  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = hit.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

export async function searchYoutube(
  query: string,
  limit = 3,
  options?: { language?: "pt" | "en" | "es"; preferPlaylist?: boolean },
): Promise<YoutubeHit[]> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  const lang = options?.language ?? "en";
  const relevanceLanguage = lang === "pt" ? "pt" : lang === "es" ? "es" : "en";

  if (key) {
    try {
      if (options?.preferPlaylist) {
        const playlistHits = await searchYoutubeApiPlaylists(key, query, limit, relevanceLanguage);
        if (playlistHits.length > 0) return playlistHits;
      }
      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}` +
        `&relevanceLanguage=${relevanceLanguage}` +
        `&q=${encodeURIComponent(query)}&key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const body = (await res.json()) as {
          items?: Array<{
            id?: { videoId?: string };
            snippet?: { title?: string; channelTitle?: string };
          }>;
        };
        return (body.items ?? [])
          .map((item) => ({
            youtubeId: item.id?.videoId ?? "",
            title: item.snippet?.title ?? query,
            channel: item.snippet?.channelTitle ?? "YouTube",
            thumbnailUrl: item.id?.videoId
              ? `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`
              : undefined,
          }))
          .filter((item) => item.youtubeId.length === 11)
          .slice(0, limit);
      }
    } catch {
      /* fall through */
    }
  }

  return searchYoutubeViaDuckDuckGo(query, limit).then(async (hits) => {
    if (hits.length > 0) return hits;
    return searchYoutubeViaResultsPage(query, limit);
  });
}

async function searchYoutubeApiPlaylists(
  key: string,
  query: string,
  limit: number,
  relevanceLanguage: string,
): Promise<YoutubeHit[]> {
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&maxResults=${limit}` +
    `&relevanceLanguage=${relevanceLanguage}` +
    `&q=${encodeURIComponent(query)}&key=${key}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return [];
  const body = (await res.json()) as {
    items?: Array<{
      id?: { playlistId?: string };
      snippet?: { title?: string; channelTitle?: string };
    }>;
  };
  const hits: YoutubeHit[] = [];
  for (const item of body.items ?? []) {
    const playlistId = item.id?.playlistId;
    if (!playlistId) continue;
    const first = await firstVideoOfPlaylist(key, playlistId);
    if (!first) continue;
    hits.push({
      youtubeId: first,
      playlistId,
      title: item.snippet?.title ?? query,
      channel: item.snippet?.channelTitle ?? "YouTube",
      thumbnailUrl: ytThumb(first),
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

async function firstVideoOfPlaylist(key: string, playlistId: string): Promise<string | null> {
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=1` +
      `&playlistId=${encodeURIComponent(playlistId)}&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      items?: Array<{ contentDetails?: { videoId?: string } }>;
    };
    return body.items?.[0]?.contentDetails?.videoId ?? null;
  } catch {
    return null;
  }
}

async function searchYoutubeViaDuckDuckGo(query: string, limit: number): Promise<YoutubeHit[]> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${query} site:youtube.com/watch`)}`,
      {
        signal: AbortSignal.timeout(10_000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ProgrameintBot/1.0; +https://localhost) AppleWebKit/537.36",
        },
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const hits: YoutubeHit[] = [];
    const seen = new Set<string>();

    const uddg = [...html.matchAll(/uddg=([^&"]+)/g)];
    for (const match of uddg) {
      const raw = match[1];
      if (!raw) continue;
      let decoded = raw;
      try {
        decoded = decodeURIComponent(raw);
      } catch {
        /* keep */
      }
      const idMatch = decoded.match(YT_ID);
      const youtubeId = idMatch?.[1];
      if (!youtubeId || seen.has(youtubeId)) continue;
      seen.add(youtubeId);
      hits.push({ youtubeId, title: query, channel: "YouTube", thumbnailUrl: ytThumb(youtubeId) });
      if (hits.length >= limit) break;
    }

    if (hits.length < limit) {
      for (const match of html.matchAll(YT_ID)) {
        const youtubeId = match[1];
        if (!youtubeId || seen.has(youtubeId)) continue;
        seen.add(youtubeId);
        hits.push({ youtubeId, title: query, channel: "YouTube", thumbnailUrl: ytThumb(youtubeId) });
        if (hits.length >= limit) break;
      }
    }

    return hits.slice(0, limit);
  } catch {
    return [];
  }
}

/** Fallback HTML do YouTube (quando API key e DDG falham). */
async function searchYoutubeViaResultsPage(query: string, limit: number): Promise<YoutubeHit[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en`,
      {
        signal: AbortSignal.timeout(12_000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const hits: YoutubeHit[] = [];
    const seen = new Set<string>();

    for (const match of html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)) {
      const youtubeId = match[1];
      if (!youtubeId || seen.has(youtubeId)) continue;
      seen.add(youtubeId);
      const around = html.slice(Math.max(0, match.index! - 400), match.index! + 400);
      const listMatch = around.match(/"playlistId":"(PL[A-Za-z0-9_-]+)"/);
      hits.push({
        youtubeId,
        title: query,
        channel: "YouTube",
        thumbnailUrl: ytThumb(youtubeId),
        playlistId: listMatch?.[1],
      });
      if (hits.length >= limit) break;
    }

    if (hits.length < limit) {
      for (const match of html.matchAll(YT_ID)) {
        const youtubeId = match[1];
        if (!youtubeId || seen.has(youtubeId)) continue;
        seen.add(youtubeId);
        hits.push({ youtubeId, title: query, channel: "YouTube", thumbnailUrl: ytThumb(youtubeId) });
        if (hits.length >= limit) break;
      }
    }

    return hits.slice(0, limit);
  } catch {
    return [];
  }
}

function ytThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function absoluteImageUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `https://duckduckgo.com${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return undefined;
}

/** Imagem do tópico via Wikipedia (pageimages) ou DuckDuckGo Instant Answer. */
export async function fetchTopicImage(query: string): Promise<string | null> {
  const wiki = await wikiExtract(query);
  if (wiki?.imageUrl) return wiki.imageUrl;

  try {
    const ddg = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "ProgrameintCurriculum/1.0" } },
    );
    if (ddg.ok) {
      const data = (await ddg.json()) as { Image?: string; ImageIsLogo?: number };
      const url = absoluteImageUrl(data.Image);
      if (url) return url;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Extrato Wikipedia (texto + imagem da página) para alimentar o corpo do módulo. */
export async function wikiExtract(
  query: string,
): Promise<{ title: string; extract: string; url?: string; imageUrl?: string } | null> {
  try {
    const search = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`,
      { signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "ProgrameintCurriculum/1.0" } },
    );
    if (!search.ok) return null;
    const data = (await search.json()) as [string, string[], string[], string[]];
    const title = data[1]?.[0];
    const pageUrl = data[3]?.[0];
    if (!title) return null;

    const [extractRes, imageRes] = await Promise.all([
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json`,
        { signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "ProgrameintCurriculum/1.0" } },
      ),
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=720&titles=${encodeURIComponent(title)}&format=json`,
        { signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "ProgrameintCurriculum/1.0" } },
      ),
    ]);
    if (!extractRes.ok) return null;
    const body = (await extractRes.json()) as {
      query?: { pages?: Record<string, { title?: string; extract?: string }> };
    };
    const page = Object.values(body.query?.pages ?? {})[0];
    const extract = page?.extract?.trim();
    if (!extract) return null;

    let imageUrl: string | undefined;
    if (imageRes.ok) {
      try {
        const imgBody = (await imageRes.json()) as {
          query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
        };
        const imgPage = Object.values(imgBody.query?.pages ?? {})[0];
        imageUrl = imgPage?.thumbnail?.source;
      } catch {
        /* ignore */
      }
    }

    return {
      title: page?.title || title,
      extract: extract.slice(0, 1200),
      url: pageUrl,
      imageUrl,
    };
  } catch {
    return null;
  }
}

