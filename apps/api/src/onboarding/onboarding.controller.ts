import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { OnboardingService } from "./onboarding.service";

@Controller()
@UseGuards(SessionGuard)
export class OnboardingController {
  constructor(@Inject(OnboardingService) private readonly onboarding: OnboardingService) {}

  @Get("onboarding")
  get(@CurrentUser() user: { id: string }) {
    return this.onboarding.get(user.id);
  }

  @Put("onboarding")
  save(@CurrentUser() user: { id: string }, @Body() body: unknown, @Req() req: Request) {
    return this.onboarding.save(user.id, body, req);
  }

  @Get("goals")
  listGoals(@CurrentUser() user: { id: string }) {
    return this.onboarding.listGoals(user.id);
  }

  @Patch("goals/:id")
  updateGoal(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.onboarding.updateGoal(user.id, id, body, req);
  }

  @Post("goals/:id/activate")
  activate(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.onboarding.activateGoal(user.id, id);
  }

  @Post("goals/:id/archive")
  archive(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.onboarding.archiveGoal(user.id, id);
  }

  @Delete("goals/:id")
  remove(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.onboarding.deleteGoal(user.id, id);
  }

  @Post("goals/:id/regenerate")
  regenerate(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.onboarding.regenerateGoal(user.id, id);
  }
}
