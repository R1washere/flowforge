import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentSession } from "./current-session.decorator";
import type { AuthSession } from "./auth-session";
import { DemoAuthGuard } from "./demo-auth.guard";

@Controller("auth")
@UseGuards(DemoAuthGuard)
export class AuthController {
  @Get("session")
  getSession(@CurrentSession() session: AuthSession) {
    return session;
  }
}
