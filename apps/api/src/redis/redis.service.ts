import { HttpException, HttpStatus, Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.client = new Redis(config.get<string>("REDIS_URL") ?? "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    });
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async consumeToken(key: string, limit: number, windowSeconds: number): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }
    if (count > limit) {
      throw new HttpException(
        {
          code: "RATE_LIMITED",
          message: "Demasiadas tentativas. Espera um minuto e tenta de novo.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async setex(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
