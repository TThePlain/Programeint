import { Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { NewsController } from "./news.controller";
import { NewsService } from "./news.service";

@Module({
  imports: [RedisModule],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
