import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { LibraryService } from "./library.service";

@Controller("library")
@UseGuards(SessionGuard)
export class LibraryController {
  constructor(@Inject(LibraryService) private readonly library: LibraryService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query("node") node?: string,
    @Query("kind") kind?: string,
  ) {
    return this.library.list(user.id, node, kind);
  }

  @Get("nodes/:slug")
  forNode(@CurrentUser() user: { id: string }, @Param("slug") slug: string) {
    return this.library.forNode(user.id, slug);
  }
}
