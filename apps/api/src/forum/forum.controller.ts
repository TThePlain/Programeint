import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { ForumService } from "./forum.service";

@Controller("forum")
@UseGuards(SessionGuard)
export class ForumController {
  constructor(@Inject(ForumService) private readonly forum: ForumService) {}

  @Get("posts")
  list(@Query("kind") kind?: string) {
    return this.forum.list(kind);
  }

  @Get("posts/:id")
  get(@Param("id") id: string) {
    return this.forum.get(id);
  }

  @Post("posts")
  create(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.forum.create(user.id, body);
  }

  @Post("posts/:id/comments")
  comment(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.forum.addComment(user.id, id, body);
  }

  @Post("posts/:id/run")
  run(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.forum.runChallenge(user.id, id, body);
  }

  @Post("posts/:id/solutions")
  solution(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.forum.addSolution(user.id, id, body);
  }
}
