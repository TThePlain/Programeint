import { Body, Controller, Get, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { tutorAskSchema } from "@programeint/shared";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { parseBody } from "../common/parse";
import { TutorService } from "./tutor.service";

@Controller("tutor")
export class TutorController {
  constructor(@Inject(TutorService) private readonly tutor: TutorService) {}

  @Get("status")
  status() {
    return this.tutor.status();
  }

  @Get("threads/:nodeSlug")
  @UseGuards(SessionGuard)
  thread(@CurrentUser() user: { id: string }, @Param("nodeSlug") nodeSlug: string) {
    return this.tutor.thread(user.id, nodeSlug);
  }

  @Post("threads/:nodeSlug/messages")
  @HttpCode(201)
  @UseGuards(SessionGuard)
  ask(
    @CurrentUser() user: { id: string },
    @Param("nodeSlug") nodeSlug: string,
    @Body() body: unknown,
  ) {
    const input = parseBody(tutorAskSchema, body);
    return this.tutor.ask(user.id, nodeSlug, input.content, input.helpLevel, input.includeLabCode);
  }
}
