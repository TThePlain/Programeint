import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { DiagnosisService } from "./diagnosis.service";

@Controller()
@UseGuards(SessionGuard)
export class DiagnosisController {
  constructor(@Inject(DiagnosisService) private readonly diagnosis: DiagnosisService) {}

  @Post("diagnosis/sessions")
  start(@CurrentUser() user: { id: string }) {
    return this.diagnosis.start(user.id);
  }

  @Post("diagnosis/sessions/:id/answers")
  answer(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.diagnosis.answer(user.id, id, body);
  }

  @Get("roadmap")
  roadmap(@CurrentUser() user: { id: string }) {
    return this.diagnosis.roadmap(user.id);
  }
}
