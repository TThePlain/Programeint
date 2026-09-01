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
import { ProjectService } from "./project.service";

@Controller()
export class ProjectController {
  constructor(@Inject(ProjectService) private readonly projects: ProjectService) {}

  @Get("projects")
  @UseGuards(SessionGuard)
  list(@CurrentUser() user: { id: string }) {
    return this.projects.list(user.id);
  }

  @Get("portfolio")
  @UseGuards(SessionGuard)
  portfolio(@CurrentUser() user: { id: string }) {
    return this.projects.portfolio(user.id);
  }

  @Get("projects/:slug")
  @UseGuards(SessionGuard)
  get(@CurrentUser() user: { id: string }, @Param("slug") slug: string) {
    return this.projects.get(user.id, slug);
  }

  @Put("projects/:slug/files")
  @UseGuards(SessionGuard)
  save(@CurrentUser() user: { id: string }, @Param("slug") slug: string, @Body() body: unknown) {
    return this.projects.save(user.id, slug, body);
  }

  @Post("projects/:slug/runs")
  @HttpCode(201)
  @UseGuards(SessionGuard)
  run(@CurrentUser() user: { id: string }, @Param("slug") slug: string) {
    return this.projects.run(user.id, slug);
  }
}
