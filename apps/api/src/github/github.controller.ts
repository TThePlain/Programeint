import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { GithubService } from "./github.service";

@Controller("github")
export class GithubController {
  constructor(@Inject(GithubService) private readonly github: GithubService) {}

  @Get("status")
  @UseGuards(SessionGuard)
  status(@CurrentUser() user: { id: string }) {
    return this.github.status(user.id);
  }

  @Get("connect")
  @UseGuards(SessionGuard)
  async connect(@CurrentUser() user: { id: string }, @Res() res: Response) {
    const url = await this.github.connectUrl(user.id);
    return res.redirect(url);
  }

  @Get("callback")
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Res() res: Response,
  ) {
    const dest = await this.github.callback(code, state);
    return res.redirect(dest);
  }

  @Post("publish-evidence")
  @HttpCode(200)
  @UseGuards(SessionGuard)
  publishEvidence(@CurrentUser() user: { id: string }) {
    return this.github.publishEvidence(user.id);
  }

  @Delete()
  @UseGuards(SessionGuard)
  disconnect(@CurrentUser() user: { id: string }) {
    return this.github.disconnect(user.id);
  }
}
