/**
 * Vídeos por nó do mapa — 1 sugestão por língua, alinhada à etapa.
 * Se o resultado for de uma playlist, preferimos abrir a série completa.
 */

import type { PrismaClient } from "@prisma/client";
import { guessVideoLanguage, hitMatchesLanguage } from "./video-language";
import { searchYoutube } from "./web-search";

export type VideoEnsureInput = {
  title: string;
  topic?: string;
  queries?: { pt?: string; en?: string; es?: string };
};

/** Uma sugestão por língua (o aluno muda a língua se quiser outra). */
const PER_LANG = 1;

function queriesFor(lang: "pt" | "en" | "es", input: VideoEnsureInput): string[] {
  const topic = (input.topic?.trim() || input.title).slice(0, 80);
  const title = input.title.slice(0, 80);
  const custom = input.queries?.[lang];
  if (lang === "pt") {
    return [
      custom,
      `${title} curso completo playlist português`,
      `${title} aula completa português`,
      `${topic} ${title} curso iniciantes`,
      `${title} tutorial português`,
    ].filter(Boolean) as string[];
  }
  if (lang === "es") {
    return [
      custom,
      `${title} curso completo playlist español`,
      `${topic} ${title} tutorial principiantes`,
      `${title} tutorial español`,
    ].filter(Boolean) as string[];
  }
  return [
    custom,
    `${title} programming full course english`,
    `learn ${title} beginners english tutorial`,
    `${title} algorithms data structures english`,
  ].filter(Boolean) as string[];
}

function tokensOf(input: VideoEnsureInput): string[] {
  const hay = `${input.title} ${input.topic ?? ""}`.toLowerCase();
  const stop = new Set(["para", "com", "the", "and", "curso", "aula", "para", "com"]);
  return hay
    .split(/[^a-z0-9à-ú+#.]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stop.has(t))
    .slice(0, 8);
}

/** Exige pelo menos um token da etapa/tópico no título. */
function relevantHit(hit: { title: string; youtubeId: string }, input: VideoEnsureInput): boolean {
  const tokens = tokensOf(input);
  if (tokens.length === 0) return Boolean(hit.youtubeId);
  const title = hit.title.toLowerCase();
  const nodeTitle = input.title.toLowerCase();
  if (title.includes(nodeTitle.slice(0, Math.min(12, nodeTitle.length)))) return true;
  return tokens.some((t) => title.includes(t));
}

/**
 * Deduplica por youtubeId e limita a `perLang` por língua.
 * Preferência: entradas com playlistId primeiro.
 */
export function capVideosPerLanguage<
  T extends { youtubeId: string; language: string; sortOrder?: number; playlistId?: string | null },
>(videos: T[], perLang = PER_LANG): T[] {
  const seenYt = new Set<string>();
  const counts = new Map<string, number>();
  const out: T[] = [];
  const sorted = [...videos].sort((a, b) => {
    const pa = a.playlistId ? 0 : 1;
    const pb = b.playlistId ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.language.localeCompare(b.language);
  });
  for (const item of sorted) {
    if (!item.youtubeId || seenYt.has(item.youtubeId)) continue;
    const n = counts.get(item.language) ?? 0;
    if (n >= perLang) continue;
    seenYt.add(item.youtubeId);
    counts.set(item.language, n + 1);
    out.push(item);
  }
  return out;
}

/** Remove duplicados / excesso já gravados. */
export async function pruneNodeVideos(prisma: PrismaClient, nodeId: string): Promise<void> {
  await repairNodeVideoLanguages(prisma, nodeId);
  const all = await prisma.studyVideo.findMany({
    where: { nodeId },
    orderBy: [{ language: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (all.length === 0) return;
  const keep = new Set(capVideosPerLanguage(all, PER_LANG).map((v) => v.id));
  const drop = all.filter((v) => !keep.has(v.id)).map((v) => v.id);
  if (drop.length === 0) return;
  await prisma.studyVideo.deleteMany({ where: { id: { in: drop } } });
}

/**
 * Corrige etiquetas de língua erradas (ex.: vídeo PT gravado como EN).
 */
export async function repairNodeVideoLanguages(
  prisma: PrismaClient,
  nodeId: string,
): Promise<void> {
  const all = await prisma.studyVideo.findMany({ where: { nodeId } });
  const occupied = new Set(all.map((v) => `${v.language}`));

  for (const row of all) {
    const guessed = guessVideoLanguage(row.title, row.channel);
    if (!guessed || guessed === row.language) {
      // EN sem sinais EN mas com PT/ES → remover
      if (
        row.language === "en" &&
        !hitMatchesLanguage({ title: row.title, channel: row.channel }, "en")
      ) {
        await prisma.studyVideo.delete({ where: { id: row.id } });
        occupied.delete("en");
      }
      continue;
    }
    // Já existe um vídeo na língua correcta → apagar o mal etiquetado
    if (occupied.has(guessed)) {
      await prisma.studyVideo.delete({ where: { id: row.id } });
      occupied.delete(row.language);
      continue;
    }
    await prisma.studyVideo.update({
      where: { id: row.id },
      data: { language: guessed },
    });
    occupied.delete(row.language);
    occupied.add(guessed);
  }
}

export async function ensureVideosForNode(
  prisma: PrismaClient,
  nodeId: string,
  input: VideoEnsureInput,
): Promise<number> {
  await pruneNodeVideos(prisma, nodeId);

  const langs: Array<"pt" | "en" | "es"> = ["pt", "en", "es"];
  const existing = await prisma.studyVideo.findMany({ where: { nodeId } });
  const haveLang = new Set(existing.map((v) => v.language));
  const seenIds = new Set(existing.map((v) => v.youtubeId));
  const missing = langs.filter((lang) => !haveLang.has(lang));

  if (missing.length === 0) {
    return existing.length;
  }

  const rows: Array<{
    nodeId: string;
    title: string;
    channel: string;
    youtubeId: string;
    playlistId: string | null;
    language: string;
    sortOrder: number;
  }> = [];

  for (const lang of missing) {
    let found = 0;
    for (const query of queriesFor(lang, input)) {
      if (found >= PER_LANG) break;
      const preferPlaylist = /playlist|curso completo|full course/i.test(query);
      const hits = await searchYoutube(query, 4, {
        language: lang,
        preferPlaylist,
      });
      const ordered = [...hits].sort(
        (a, b) => Number(Boolean(b.playlistId)) - Number(Boolean(a.playlistId)),
      );
      for (const hit of ordered) {
        if (found >= PER_LANG) break;
        if (!hit.youtubeId || seenIds.has(hit.youtubeId)) continue;
        if (!relevantHit(hit, input)) continue;
        if (!hitMatchesLanguage(hit, lang)) continue;
        seenIds.add(hit.youtubeId);
        rows.push({
          nodeId,
          title: hit.title.slice(0, 180) || `${input.title} (${lang})`,
          channel: hit.channel.slice(0, 120) || "YouTube",
          youtubeId: hit.youtubeId,
          playlistId: hit.playlistId?.slice(0, 64) ?? null,
          language: lang,
          sortOrder: 0,
        });
        found += 1;
      }
    }
  }

  // Fallback EN só se EN ainda faltar e nada foi encontrado nessa língua
  if (!haveLang.has("en") && !rows.some((r) => r.language === "en")) {
    const title = input.title.slice(0, 80);
    const hits = await searchYoutube(`${title} programming tutorial english`, 3, {
      language: "en",
    });
    for (const hit of hits) {
      if (!hit.youtubeId || seenIds.has(hit.youtubeId)) continue;
      if (!hitMatchesLanguage(hit, "en")) continue;
      seenIds.add(hit.youtubeId);
      rows.push({
        nodeId,
        title: hit.title.slice(0, 180),
        channel: hit.channel.slice(0, 120) || "YouTube",
        youtubeId: hit.youtubeId,
        playlistId: hit.playlistId?.slice(0, 64) ?? null,
        language: "en",
        sortOrder: 0,
      });
      break;
    }
  }

  if (rows.length > 0) {
    await prisma.studyVideo.createMany({ data: rows, skipDuplicates: true });
  }
  await pruneNodeVideos(prisma, nodeId);
  return prisma.studyVideo.count({ where: { nodeId } });
}
