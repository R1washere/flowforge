"use client";

import { useRouter } from "next/navigation";
import { demoAuthStorageKey, demoUsers } from "../../lib/demo-auth";

export function DemoLoginPanel() {
  const router = useRouter();

  function loginAs(email: string) {
    window.localStorage.setItem(demoAuthStorageKey, email);
    router.push("/");
    router.refresh();
  }

  return (
    <section className="login-shell">
      <div className="login-panel">
        <span className="eyebrow">FlowForge demo</span>
        <h1>Choose demo access</h1>
        <p>
          Switch between workspace roles and see backend permissions block or
          allow real API actions.
        </p>

        <div className="demo-user-grid">
          {demoUsers.map((user) => (
            <button
              className="demo-user-card"
              key={user.email}
              onClick={() => loginAs(user.email)}
              type="button"
            >
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <span className="status-pill active">{user.role}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
