import type { Request } from "express";
import type { DemoAuthSession } from "@flowforge/shared";

export type AuthSession = DemoAuthSession;

export interface AuthenticatedRequest extends Request {
  authSession?: AuthSession;
}
