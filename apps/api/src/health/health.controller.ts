import { Controller, Get, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  @Get()
  live() {
    return {
      status: "ok",
      service: "programeint-api",
      time: new Date().toISOString(),
    };
  }

  @Get("ready")
  async ready() {
    const [db] = await this.prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
    const redis = await this.redis.ping();
    return {
      status: "ok",
      database: db?.ok === 1,
      redis: redis === "PONG",
      time: new Date().toISOString(),
    };
  }
}
