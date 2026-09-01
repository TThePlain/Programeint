/**
 * Heurística de língua do vídeo (título + canal).
 * Evita etiquetar um vídeo PT como EN (ou o inverso).
 */

const PT_WORDS =
  /\b(portugu[eê]s|programa[cç][aã]o|l[oó]gica|algoritmos?|estruturas?|dados|aula|aulas|iniciantes|completo|guanabara|devdojo|alura|rocketseat|attekita|fernanda|michelli)\b/i;

const ES_WORDS =
  /\b(espa[nñ]ol|programaci[oó]n|algoritmos?|principiantes|programacionats|hola\s*mundo|datos|completo)\b/i;

const EN_WORDS =
  /\b(english|beginners?|full\s*course|crash\s*course|data\s*structures?|programming|algorithms?|freecodecamp|harvard|cs50|learn\s+to|how\s+to)\b/i;

const PT_CHANNELS =
  /\b(curso em v[ií]deo|guanabara|devdojo|loiane|alura|rocketseat|attekita|codigo fonte tv|fernanda kipper)\b/i;

const ES_CHANNELS = /\b(programacion\s*ats|pildorasinformaticas|hdeleon|soy dalto)\b/i;

const EN_CHANNELS = /\b(freecodecamp|traversy|mosh|bro code|fireship|the net ninja|cs50)\b/i;

export type VideoLang = "pt" | "en" | "es";

export function guessVideoLanguage(title: string, channel: string): VideoLang | null {
  const text = `${title} ${channel}`.toLowerCase();
  let pt = 0;
  let en = 0;
  let es = 0;

  if (PT_CHANNELS.test(text)) pt += 4;
  if (ES_CHANNELS.test(text)) es += 4;
  if (EN_CHANNELS.test(text)) en += 4;

  if (PT_WORDS.test(text)) pt += 3;
  if (ES_WORDS.test(text)) es += 2;
  if (EN_WORDS.test(text)) en += 2;

  // Acentos tipicamente PT / ES
  if (/[ãõ]/.test(text)) pt += 3;
  if (/[ñ¿¡]/.test(text)) es += 3;

  // Sinais explícitos de língua no título vencem o resto
  if (/\bespa[nñ]ol\b/.test(text)) es += 5;
  if (/\bportugu[eê]s\b/.test(text)) pt += 5;
  if (/\benglish\b/.test(text)) en += 5;

  // "tutorial" sozinho não conta como EN se o resto for PT/ES
  if (/\btutorial\b/i.test(text) && pt === 0 && es === 0) en += 1;

  const best = Math.max(pt, en, es);
  if (best === 0) return null;
  if (pt === best) return "pt";
  if (es === best) return "es";
  return "en";
}

/** Aceita o hit só se a língua pedida bater com a língua detectada. */
export function hitMatchesLanguage(
  hit: { title: string; channel: string },
  lang: VideoLang,
): boolean {
  const guessed = guessVideoLanguage(hit.title, hit.channel);
  if (guessed) return guessed === lang;

  // Ambíguo: EN não pode ter palavras tipicamente PT/ES
  if (lang === "en") {
    const text = `${hit.title} ${hit.channel}`;
    return (
      !PT_WORDS.test(text) &&
      !ES_WORDS.test(text) &&
      !PT_CHANNELS.test(text) &&
      !/[ãõáàâêéíóôúçñ]/.test(text)
    );
  }
  if (lang === "pt") return !EN_CHANNELS.test(`${hit.title} ${hit.channel}`);
  if (lang === "es") {
    const text = `${hit.title} ${hit.channel}`;
    return !EN_CHANNELS.test(text) && !PT_CHANNELS.test(text);
  }
  return true;
}
