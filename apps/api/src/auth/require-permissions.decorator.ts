import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@flowforge/shared";

export const REQUIRED_PERMISSIONS_KEY = "requiredPermissions";

export function RequirePermissions(...permissions: Permission[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
}
