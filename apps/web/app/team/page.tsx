import { AppShell } from "../../components/app/app-shell";
import { TeamAccessPanel } from "../../components/app/team-access-panel";
import { getRolePolicies, getTeamMembers } from "../../lib/api-client";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [members, rolePolicies] = await Promise.all([
    getTeamMembers(),
    getRolePolicies(),
  ]);

  return (
    <AppShell activePath="/team">
      <section className="page-header">
        <div>
          <span className="eyebrow">Access control</span>
          <h1>Team & roles</h1>
          <p>
            Manage workspace members, inspect role permissions, and verify
            access-control behavior that protects operational workflows.
          </p>
        </div>
      </section>

      <TeamAccessPanel initialMembers={members} rolePolicies={rolePolicies} />
    </AppShell>
  );
}
