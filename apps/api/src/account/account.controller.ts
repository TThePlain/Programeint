import { Body, Controller, Delete, Get, Inject, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { AuthService } from "../auth/auth.service";
import { AccountService } from "./account.service";

@Controller("account")
@UseGuards(SessionGuard)
export class AccountController {
  constructor(
    @Inject(AccountService) private readonly account: AccountService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get("export")
  export(@CurrentUser() user: { id: string }) {
    return this.account.export(user.id);
  }

  @Delete()
  async remove(
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
    @Req() req: import("express").Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.account.remove(user.id, body);
    await this.auth.logout(req, res);
    return result;
  }
}
