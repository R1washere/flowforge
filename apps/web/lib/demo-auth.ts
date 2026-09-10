export const demoUsers = [
  {
    email: "demo@flowforge.dev",
    name: "Demo Operator",
    role: "owner",
  },
  {
    email: "maria.ops@northstar.dev",
    name: "Maria Ops",
    role: "admin",
  },
  {
    email: "alex.automation@northstar.dev",
    name: "Alex Automation",
    role: "operator",
  },
  {
    email: "nina.finance@northstar.dev",
    name: "Nina Finance",
    role: "viewer",
  },
] as const;

export const demoAuthStorageKey = "flowforge.demoUserEmail";
export const defaultDemoUserEmail = demoUsers[0].email;

export function getDemoAuthHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  if (typeof window === "undefined") {
    return {
      ...headers,
      "x-flowforge-user-email": defaultDemoUserEmail,
    };
  }

  return {
    ...headers,
    "x-flowforge-user-email":
      window.localStorage.getItem(demoAuthStorageKey) ?? defaultDemoUserEmail,
  };
}
