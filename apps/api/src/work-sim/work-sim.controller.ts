import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { WorkSimService } from "./work-sim.service";

@Controller("work-sim")
@UseGuards(SessionGuard)
export class WorkSimController {
  constructor(@Inject(WorkSimService) private readonly workSim: WorkSimService) {}

  @Get()
  status(@CurrentUser() user: { id: string }) {
    return this.workSim.status(user.id);
  }

  @Post("submit")
  submit(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.workSim.submit(user.id, body);
  }
}
