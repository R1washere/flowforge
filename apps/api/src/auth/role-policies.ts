import type { OrganizationRole, Permission } from "@flowforge/shared";

export const rolePolicies: Record<
  OrganizationRole,
  { description: string; permissions: Permission[] }
> = {
  owner: {
    description:
      "Full workspace control, billing-level governance, and team management.",
    permissions: [
      "workflows:read",
      "workflows:write",
      "workflows:execute",
      "integrations:read",
      "integrations:manage",
      "audit:read",
      "team:read",
      "team:manage",
    ],
  },
  admin: {
    description:
      "Can manage automations, integrations, audit logs, and most team access.",
    permissions: [
      "workflows:read",
      "workflows:write",
      "workflows:execute",
      "integrations:read",
      "integrations:manage",
      "audit:read",
      "team:read",
      "team:manage",
    ],
  },
  operator: {
    description:
      "Can run workflows and debug executions without changing security settings.",
    permissions: [
      "workflows:read",
      "workflows:execute",
      "integrations:read",
      "audit:read",
      "team:read",
    ],
  },
  viewer: {
    description:
      "Read-only visibility into workflows, executions, and team context.",
    permissions: ["workflows:read", "audit:read", "team:read"],
  },
};

export function getPermissionsForRole(role: OrganizationRole): Permission[] {
  return rolePolicies[role]?.permissions ?? [];
}

export function hasPermission(role: OrganizationRole, permission: Permission) {
  return getPermissionsForRole(role).includes(permission);
}
