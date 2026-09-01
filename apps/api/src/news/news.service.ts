import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  NEWS_CATEGORIES,
  type NewsCategory,
  type TechNewsItem,
  type TechNewsSourceInfo,
} from "@programeint/shared";
import { RedisService } from "../redis/redis.service";
import { collectTechNews, listNewsSearchEngines } from "./collect-news";

const CACHE_KEY = "programeint:news:v6";
const CACHE_TTL_SEC = 20 * 60; // motor a correr de 20 em 20 min

type NewsCachePayload = {
  refreshedAt: string;
  nextRefreshAt: string;
  items: TechNewsItem[];
  sources: TechNewsSourceInfo[];
};

@Injectable()
export class NewsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NewsService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private inflight: Promise<NewsCachePayload> | null = null;

  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  onModuleInit() {
    void this.refresh();
    this.timer = setInterval(() => {
      void this.refresh();
    }, CACHE_TTL_SEC * 1000);
    this.logger.log("Motor de News activo — pesquisa automática a cada 20 minutos.");
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async list(category?: string) {
    const bundle = await this.load();
    const cat =
      category && (NEWS_CATEGORIES as readonly string[]).includes(category)
        ? (category as NewsCategory)
        : "all";

    const filtered =
      cat === "all" ? bundle.items : bundle.items.filter((item) => item.category === cat);

    return {
      policy:
        "Motor de busca automático em imprensa tecnológica reconhecida. Fotos e fontes vêm dos feeds oficiais. Sem blogs anónimos.",
      refreshedAt: bundle.refreshedAt,
      nextRefreshAt: bundle.nextRefreshAt,
      cacheTtlMinutes: Math.round(CACHE_TTL_SEC / 60),
      category: cat,
      total: filtered.length,
      sources: bundle.sources,
      items: filtered.slice(0, 120),
    };
  }

  private async load(): Promise<NewsCachePayload> {
    try {
      const cached = await this.redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached) as NewsCachePayload;
    } catch {
      /* ignore */
    }
    return this.refresh();
  }

  private refresh(): Promise<NewsCachePayload> {
    if (this.inflight) return this.inflight;
    this.inflight = this.runRefresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async runRefresh(): Promise<NewsCachePayload> {
    try {
      this.logger.log("News: a pesquisar feeds (ciclo 20 min)…");
      const items = await collectTechNews();
      const now = Date.now();
      const bundle: NewsCachePayload = {
        refreshedAt: new Date(now).toISOString(),
        nextRefreshAt: new Date(now + CACHE_TTL_SEC * 1000).toISOString(),
        items,
        sources: listNewsSearchEngines(),
      };
      await this.redis.setex(CACHE_KEY, JSON.stringify(bundle), CACHE_TTL_SEC + 60);
      this.logger.log(`News: ${items.length} artigos em cache.`);
      return bundle;
    } catch (err) {
      this.logger.warn(`News refresh falhou: ${err instanceof Error ? err.message : "erro"}`);
      try {
        const cached = await this.redis.get(CACHE_KEY);
        if (cached) return JSON.parse(cached) as NewsCachePayload;
      } catch {
        /* ignore */
      }
      const now = Date.now();
      return {
        refreshedAt: new Date(now).toISOString(),
        nextRefreshAt: new Date(now + CACHE_TTL_SEC * 1000).toISOString(),
        items: [],
        sources: listNewsSearchEngines(),
      };
    }
  }
}
