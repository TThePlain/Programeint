import { Controller, Get, Inject, Query } from "@nestjs/common";
import { NewsService } from "./news.service";

@Controller("news")
export class NewsController {
  constructor(@Inject(NewsService) private readonly news: NewsService) {}

  @Get()
  list(@Query("category") category?: string) {
    return this.news.list(category);
  }
}
