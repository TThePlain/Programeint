export const RESOURCE_KINDS = ["docs", "book", "article", "video", "spec", "course"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/**
 * Licenças aceites na biblioteca. Um recurso sem licença conhecida não entra:
 * é assim que a regra "sem pirataria" deixa de ser texto e passa a ser código.
 */
export const RESOURCE_LICENSES = {
  "Apache-2.0": {
    label: "Apache License 2.0",
    url: "https://www.apache.org/licenses/LICENSE-2.0",
    redistributable: true,
  },
  "EPL-2.0": {
    label: "Eclipse Public License 2.0",
    url: "https://www.eclipse.org/legal/epl-2.0/",
    redistributable: true,
  },
  "GPL-2.0-with-classpath-exception": {
    label: "GPLv2 com Classpath Exception",
    url: "https://openjdk.org/legal/gplv2+ce.html",
    redistributable: true,
  },
  PostgreSQL: {
    label: "PostgreSQL License",
    url: "https://www.postgresql.org/about/licence/",
    redistributable: true,
  },
  "CC-BY-SA-4.0": {
    label: "Creative Commons BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    redistributable: true,
  },
  "CC-BY-SA-2.5": {
    label: "Creative Commons BY-SA 2.5",
    url: "https://creativecommons.org/licenses/by-sa/2.5/",
    redistributable: true,
  },
  "CC-BY-4.0": {
    label: "Creative Commons BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    redistributable: true,
  },
  "CC-BY-NC-SA-3.0": {
    label: "Creative Commons BY-NC-SA 3.0",
    url: "https://creativecommons.org/licenses/by-nc-sa/3.0/",
    redistributable: false,
  },
  "PSF-2.0": {
    label: "Python Software Foundation License 2.0",
    url: "https://docs.python.org/3/license.html",
    redistributable: true,
  },
} as const;

export type ResourceLicenseId = keyof typeof RESOURCE_LICENSES;

export function licenseInfo(id: string) {
  return RESOURCE_LICENSES[id as ResourceLicenseId] ?? null;
}

export type ResourceCandidate = {
  title: string;
  url: string;
  license: string;
  kind: string;
  /** O link aponta para o site do próprio editor, não para uma cópia. */
  official: boolean;
};

export type ListableRejection =
  | "url_insegura"
  | "licenca_desconhecida"
  | "tipo_desconhecido"
  | "fonte_nao_oficial";

/**
 * A biblioteca só liga à fonte; nunca aloja nem copia o conteúdo.
 * Um recurso que falhe qualquer regra fica de fora em vez de entrar com aviso.
 */
export function listableRejection(candidate: ResourceCandidate): ListableRejection | null {
  if (!candidate.url.startsWith("https://")) return "url_insegura";
  if (!licenseInfo(candidate.license)) return "licenca_desconhecida";
  if (!RESOURCE_KINDS.includes(candidate.kind as ResourceKind)) return "tipo_desconhecido";
  if (!candidate.official) return "fonte_nao_oficial";
  return null;
}

export function resourceIsListable(candidate: ResourceCandidate) {
  return listableRejection(candidate) === null;
}
