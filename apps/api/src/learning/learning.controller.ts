import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { LearningService } from "./learning.service";

@Controller("learning")
@UseGuards(SessionGuard)
export class LearningController {
  constructor(@Inject(LearningService) private readonly learning: LearningService) {}

  @Get("next")
  next(@CurrentUser() user: { id: string }) {
    return this.learning.next(user.id);
  }

  @Get("evolution")
  evolution(@CurrentUser() user: { id: string }) {
    return this.learning.evolution(user.id);
  }

  @Get("modules/:nodeSlug")
  modulePreview(@CurrentUser() user: { id: string }, @Param("nodeSlug") nodeSlug: string) {
    return this.learning.modulePreview(user.id, nodeSlug);
  }

  @Get("videos/:nodeSlug")
  videos(@CurrentUser() user: { id: string }, @Param("nodeSlug") nodeSlug: string) {
    return this.learning.videosForNode(user.id, nodeSlug);
  }

  @Post("sessions")
  start(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.learning.start(user.id, body);
  }

  @Post("sessions/:id/read")
  read(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.learning.markRead(user.id, id);
  }

  @Post("sessions/:id/check")
  check(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() body: unknown) {
    return this.learning.check(user.id, id, body);
  }

  @Post("reviews")
  review(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.learning.review(user.id, body);
  }
}
