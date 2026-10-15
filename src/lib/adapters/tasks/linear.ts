import type { Handover } from "@/lib/pipeline/package-schemas";

/**
 * Task-tracker adapter (Linear). Creates one project per campaign and one
 * issue per brief, labelled by epic. Without LINEAR_API_KEY the handover is
 * shown as a preview and can be downloaded as JSON instead.
 */
export function linearReady(): boolean {
  return !!process.env.LINEAR_API_KEY && !!process.env.LINEAR_TEAM_ID;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: process.env.LINEAR_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Linear: ${json.errors.map((e) => e.message).join("; ")}`);
  return json.data as T;
}

export async function pushToLinear(handover: Handover, launchDate: string): Promise<{ projectUrl: string; issues: number }> {
  if (!linearReady()) throw new Error("Linear is not connected. Add LINEAR_API_KEY and LINEAR_TEAM_ID to .env.local.");
  const teamId = process.env.LINEAR_TEAM_ID!;
  const project = await gql<{ projectCreate: { project: { id: string; url: string } } }>(
    `mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { project { id url } } }`,
    { input: { name: handover.projectName, teamIds: [teamId], targetDate: launchDate } },
  );
  let count = 0;
  for (const epic of handover.epics) {
    for (const issue of epic.issues) {
      const due = new Date(new Date(launchDate).getTime() + issue.dueDay * 86_400_000).toISOString().slice(0, 10);
      const description = [
        `**Workstream:** ${epic.name}`,
        `**Owner role:** ${issue.role}`,
        `## Objective\n${issue.objective}`,
        `## Spec\n${issue.spec}`,
        issue.copy ? `## Copy\n${issue.copy}` : "",
        `## Acceptance criteria\n${issue.acceptance.map((a) => `- [ ] ${a}`).join("\n")}`,
        issue.dependsOn.length ? `## Depends on\n${issue.dependsOn.map((d) => `- ${d}`).join("\n")}` : "",
        "_Created by Brian._",
      ]
        .filter(Boolean)
        .join("\n\n");
      await gql(
        `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success } }`,
        { input: { teamId, projectId: project.projectCreate.project.id, title: issue.title, description, dueDate: due } },
      );
      count++;
    }
  }
  return { projectUrl: project.projectCreate.project.url, issues: count };
}
