import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() body: unknown, @Req() req: Request) {
    return this.auth.register(body, req);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(body, req, res);
  }

  @Post("logout")
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }

  @Get("session")
  session(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.session(req, res);
  }

  @Post("verify-email")
  verifyEmail(@Body() body: unknown) {
    return this.auth.verifyEmail(body);
  }

  @Post("resend-verification")
  resendVerification(@Body() body: unknown, @Req() req: Request) {
    return this.auth.resendVerification(body, req);
  }

  @Post("forgot-password")
  forgotPassword(@Body() body: unknown, @Req() req: Request) {
    return this.auth.forgotPassword(body, req);
  }

  @Post("reset-password")
  resetPassword(@Body() body: unknown) {
    return this.auth.resetPassword(body);
  }
}
