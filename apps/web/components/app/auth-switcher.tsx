"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DemoAuthSession } from "@flowforge/shared";
import {
  defaultDemoUserEmail,
  demoAuthStorageKey,
  demoUsers,
  getDemoAuthHeaders,
} from "../../lib/demo-auth";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4200/api";

export function AuthSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedEmail, setSelectedEmail] =
    useState<string>(defaultDemoUserEmail);
  const [session, setSession] = useState<DemoAuthSession | null>(null);

  useEffect(() => {
    const storedEmail =
      window.localStorage.getItem(demoAuthStorageKey) ?? defaultDemoUserEmail;
    setSelectedEmail(storedEmail);
    void loadSession(storedEmail);
  }, []);

  function selectUser(email: string) {
    setSelectedEmail(email);
    window.localStorage.setItem(demoAuthStorageKey, email);

    startTransition(async () => {
      await loadSession(email);
      router.refresh();
    });
  }

  async function loadSession(email: string) {
    const response = await fetch(`${apiBaseUrl}/auth/session`, {
      headers: getDemoAuthHeaders({
        "x-flowforge-user-email": email,
      }),
    });

    if (response.ok) {
      setSession((await response.json()) as DemoAuthSession);
    }
  }

  return (
    <div className="auth-card">
      <div>
        <span className="eyebrow">Demo access</span>
        <strong>{session?.name ?? "Demo Operator"}</strong>
        <span>{session ? `${session.role} session` : "owner session"}</span>
      </div>

      <select
        aria-label="Demo user"
        disabled={isPending}
        onChange={(event) => selectUser(event.target.value)}
        value={selectedEmail}
      >
        {demoUsers.map((user) => (
          <option key={user.email} value={user.email}>
            {user.name} · {user.role}
          </option>
        ))}
      </select>

      <Link href="/login">Open demo login</Link>
    </div>
  );
}
