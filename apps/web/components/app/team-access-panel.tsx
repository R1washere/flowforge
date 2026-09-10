"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  OrganizationRole,
  RolePolicySummary,
  TeamMemberSummary,
} from "@flowforge/shared";
import { getApiErrorMessage } from "../../lib/api-error";
import { getDemoAuthHeaders } from "../../lib/demo-auth";
import { EmptyState } from "./empty-state";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4200/api";

const roles: OrganizationRole[] = ["owner", "admin", "operator", "viewer"];

export function TeamAccessPanel({
  initialMembers,
  rolePolicies,
}: {
  initialMembers: TeamMemberSummary[];
  rolePolicies: RolePolicySummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [members, setMembers] = useState(initialMembers);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateRole(memberId: string, role: OrganizationRole) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/team/${memberId}/role`, {
          method: "PATCH",
          headers: getDemoAuthHeaders({
            "content-type": "application/json",
          }),
          body: JSON.stringify({ role }),
        });

        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(
              response,
              `Role update returned ${response.status}`,
            ),
          );
        }

        const updatedMember = (await response.json()) as TeamMemberSummary;
        setMembers((currentMembers) =>
          currentMembers.map((member) =>
            member.id === updatedMember.id ? updatedMember : member,
          ),
        );
        setMessage(`${updatedMember.email} is now ${updatedMember.role}`);
        router.refresh();
      } catch (roleError) {
        setError(
          roleError instanceof Error ? roleError.message : "Role update failed",
        );
      }
    });
  }

  return (
    <section className="team-layout">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Members</h2>
            <span className="panel-kicker">
              Workspace roles and permissions
            </span>
          </div>
        </div>

        <div className="team-table">
          <div className="team-row team-header">
            <span>Member</span>
            <span>Role</span>
            <span>Status</span>
            <span>Permissions</span>
          </div>

          {members.length === 0 ? (
            <EmptyState
              title="No team members"
              description="Invite operators and viewers to model role-based access."
            />
          ) : (
            members.map((member) => (
              <article className="team-row" key={member.id}>
                <div>
                  <strong>{member.name ?? member.email}</strong>
                  <small>{member.email}</small>
                </div>
                <select
                  aria-label={`Role for ${member.email}`}
                  disabled={isPending}
                  onChange={(event) =>
                    updateRole(
                      member.id,
                      event.target.value as OrganizationRole,
                    )
                  }
                  value={member.role}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <span className={`status-pill ${member.status}`}>
                  {member.status}
                </span>
                <span>{member.permissions.length} permissions</span>
              </article>
            ))
          )}
        </div>

        {message ? (
          <div className="scheduler-result">
            <strong>Role updated</strong>
            <span>{message}</span>
          </div>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Role policies</h2>
            <span className="panel-kicker">Static RBAC matrix</span>
          </div>
        </div>

        <div className="role-policy-list">
          {rolePolicies.length === 0 ? (
            <EmptyState
              title="No role policies"
              description="Role definitions will appear here once the API is available."
            />
          ) : (
            rolePolicies.map((policy) => (
              <article className="role-policy" key={policy.role}>
                <div>
                  <strong>{policy.role}</strong>
                  <span>{policy.description}</span>
                </div>
                <div className="scope-list">
                  {policy.permissions.map((permission) => (
                    <span key={permission}>{permission}</span>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
