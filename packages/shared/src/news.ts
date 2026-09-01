export const NEWS_CATEGORIES = ["all", "programming", "tech", "ai", "updates"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const newsCategoryLabel: Record<NewsCategory, string> = {
  all: "Tudo",
  programming: "Programação",
  tech: "Tecnologia",
  ai: "IA",
  updates: "Actualizações",
};

export type TechNewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceHost: string;
  searchEngine: string;
  publishedAt: string | null;
  category: Exclude<NewsCategory, "all">;
  imageUrl?: string | null;
};

export type TechNewsSourceInfo = {
  id: string;
  label: string;
  kind: "rss" | "google-news";
};
