import Link from "next/link";
import { AuthSwitcher } from "./auth-switcher";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/workflows", label: "Workflows" },
  { href: "/builder", label: "Builder" },
  { href: "/executions", label: "Executions" },
  { href: "/governance", label: "Governance" },
  { href: "/team", label: "Team" },
];

export function AppShell({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath: string;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">F</span>
          <span>
            <span className="brand-title">FlowForge</span>
            <span className="brand-subtitle">Automation ops</span>
          </span>
        </Link>

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              className={
                activePath === item.href ? "nav-item active" : "nav-item"
              }
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="workspace-card">
          <span className="eyebrow">Workspace</span>
          <strong>Northstar SaaS</strong>
          <span>3 workflows · SQLite demo</span>
        </div>

        <AuthSwitcher />
      </aside>

      <main className="main-panel">{children}</main>
    </div>
  );
}
