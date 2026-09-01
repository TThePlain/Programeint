import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { LabService } from "./lab.service";

@Controller("lab")
export class LabController {
  constructor(@Inject(LabService) private readonly lab: LabService) {}

  @Get("status")
  status() {
    return this.lab.status();
  }

  /** Catálogo de prática do objectivo (rota estática — não usar /exercises). */
  @Get("practice")
  @UseGuards(SessionGuard)
  list(@CurrentUser() user: { id: string }) {
    return this.lab.listForGoal(user.id);
  }

  @Get("exercises/:slug")
  @UseGuards(SessionGuard)
  get(@CurrentUser() user: { id: string }, @Param("slug") slug: string) {
    return this.lab.getExercise(user.id, slug);
  }

  @Put("exercises/:slug/files")
  @UseGuards(SessionGuard)
  save(@CurrentUser() user: { id: string }, @Param("slug") slug: string, @Body() body: unknown) {
    return this.lab.save(user.id, slug, body);
  }

  @Post("exercises/:slug/runs")
  @HttpCode(201)
  @UseGuards(SessionGuard)
  run(@CurrentUser() user: { id: string }, @Param("slug") slug: string) {
    return this.lab.run(user.id, slug);
  }
}
