/**
 * Linear, as the calendar's task backend. Every task created or edited in
 * Brian's calendar is a real Linear issue: title, description, team, state,
 * assignee, priority, labels, project, estimate and due date. Needs
 * LINEAR_API_KEY (Linear → Settings → Security & access → Personal API keys).
 * LINEAR_TEAM (key such as SMCA) sets the default team for new tasks.
 */
const API = "https://api.linear.app/graphql";

export function linearReady(): boolean {
  return !!process.env.LINEAR_API_KEY;
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: process.env.LINEAR_API_KEY! },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length) throw new Error(`Linear: ${json.errors?.[0]?.message ?? `HTTP ${res.status}`}`);
  return json.data as T;
}

export interface LinearMeta {
  teams: { id: string; key: string; name: string; color?: string; states: { id: string; name: string; type: string; color: string; position: number }[] }[];
  labels: { id: string; name: string; color: string; teamId: string | null }[];
  projects: { id: string; name: string; color: string; teamIds: string[] }[];
  users: { id: string; name: string; displayName: string; email?: string; avatarUrl: string | null }[];
  defaultTeamId: string | null;
}

let metaCache: { at: number; meta: LinearMeta } | null = null;

export async function linearMeta(force = false): Promise<LinearMeta> {
  if (!force && metaCache && Date.now() - metaCache.at < 10 * 60_000) return metaCache.meta;
  const d = await gql<{
    teams: { nodes: { id: string; key: string; name: string; color: string | null; states: { nodes: LinearMeta["teams"][number]["states"] } }[] };
    projects: { nodes: { id: string; name: string; color: string; teams: { nodes: { id: string }[] } }[] };
    users: { nodes: { id: string; name: string; displayName: string; email: string; avatarUrl: string | null; active: boolean }[] };
  }>(`query {
    teams(first: 50) { nodes { id key name color states { nodes { id name type color position } } } }
    projects(first: 100) { nodes { id name color teams { nodes { id } } } }
    users(first: 250) { nodes { id name displayName email avatarUrl active } }
  }`);
  // Big workspaces have hundreds of labels, so they're read page by page.
  const labels: { id: string; name: string; color: string; team: { id: string } | null }[] = [];
  let after: string | null = null;
  do {
    const page: { issueLabels: { nodes: typeof labels; pageInfo: { hasNextPage: boolean; endCursor: string } } } = await gql(
      `query($after: String) { issueLabels(first: 250, after: $after) { nodes { id name color team { id } } pageInfo { hasNextPage endCursor } } }`,
      { after },
    );
    labels.push(...page.issueLabels.nodes);
    after = page.issueLabels.pageInfo.hasNextPage ? page.issueLabels.pageInfo.endCursor : null;
  } while (after && labels.length < 2000);
  const want = (process.env.LINEAR_TEAM ?? "").toLowerCase();
  const teams = d.teams.nodes.map((t) => ({ id: t.id, key: t.key, name: t.name, color: t.color ?? undefined, states: [...t.states.nodes].sort((a, b) => a.position - b.position) }));
  const meta: LinearMeta = {
    teams,
    labels: labels.map((l) => ({ id: l.id, name: l.name, color: l.color, teamId: l.team?.id ?? null })),
    projects: d.projects.nodes.map((p) => ({ id: p.id, name: p.name, color: p.color, teamIds: p.teams.nodes.map((t) => t.id) })),
    users: d.users.nodes.filter((u) => u.active).map(({ id, name, displayName, email, avatarUrl }) => ({ id, name, displayName, email, avatarUrl })),
    defaultTeamId: teams.find((t) => t.key.toLowerCase() === want || t.id === process.env.LINEAR_TEAM || t.name.toLowerCase() === want)?.id ?? teams[0]?.id ?? null,
  };
  metaCache = { at: Date.now(), meta };
  return meta;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  dueDate: string | null;
  priority: number;
  estimate: number | null;
  state: { id: string; name: string; type: string; color: string };
  team: { id: string; key: string };
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  project: { id: string; name: string; color: string } | null;
  labels: { nodes: { id: string; name: string; color: string }[] };
  parent: { id: string; identifier: string; title: string } | null;
  children: { nodes: { id: string; identifier: string; title: string; state: { type: string } }[] };
  updatedAt: string;
}

const ISSUE_FIELDS = `id identifier title description url dueDate priority estimate updatedAt
  state { id name type color } team { id key } assignee { id name avatarUrl }
  project { id name color } labels { nodes { id name color } }
  parent { id identifier title } children(first: 20) { nodes { id identifier title state { type } } }`;

async function paged(filter: Record<string, unknown>, max = 2000): Promise<LinearIssue[]> {
  const out: LinearIssue[] = [];
  let after: string | null = null;
  do {
    const d: { issues: { nodes: LinearIssue[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } = await gql(
      `query($filter: IssueFilter, $after: String) { issues(first: 150, after: $after, filter: $filter) { nodes { ${ISSUE_FIELDS} } pageInfo { hasNextPage endCursor } } }`,
      { filter, after },
    );
    out.push(...d.issues.nodes);
    after = d.issues.pageInfo.hasNextPage ? d.issues.pageInfo.endCursor : null;
  } while (after && out.length < max);
  return out;
}

/** Issues due between two dates (inclusive). Cancelled issues are left out. */
export function issuesInRange(from: string, to: string, teamKey?: string): Promise<LinearIssue[]> {
  return paged({ dueDate: { gte: from, lte: to }, state: { type: { neq: "canceled" } }, ...(teamKey ? { team: { key: { eq: teamKey } } } : {}) });
}

/** Open issues with no due date, for the unscheduled tray. */
export function unscheduledIssues(): Promise<LinearIssue[]> {
  return paged({ dueDate: { null: true }, state: { type: { nin: ["completed", "canceled"] } } }, 450);
}

export interface IssueInput {
  title?: string;
  description?: string;
  teamId?: string;
  stateId?: string;
  assigneeId?: string | null;
  priority?: number;
  labelIds?: string[];
  projectId?: string | null;
  estimate?: number | null;
  dueDate?: string | null;
  parentId?: string | null;
}

export async function createIssue(input: IssueInput & { teamId: string; title: string }): Promise<LinearIssue> {
  const d = await gql<{ issueCreate: { issue: LinearIssue } }>(
    `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { issue { ${ISSUE_FIELDS} } } }`,
    { input: clean(input) },
  );
  return d.issueCreate.issue;
}

export async function updateIssue(id: string, input: IssueInput): Promise<LinearIssue> {
  const d = await gql<{ issueUpdate: { issue: LinearIssue } }>(
    `mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { issue { ${ISSUE_FIELDS} } } }`,
    { id, input: clean(input) },
  );
  return d.issueUpdate.issue;
}

export async function archiveIssue(id: string): Promise<void> {
  await gql(`mutation($id: String!) { issueArchive(id: $id) { success } }`, { id });
}

/** Drop undefined fields so an update only touches what was sent. */
function clean(o: object) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

export interface LinearComment {
  id: string;
  body: string;
  createdAt: string;
  user: { name: string; avatarUrl: string | null } | null;
}

export async function issueComments(issueId: string): Promise<LinearComment[]> {
  const d = await gql<{ issue: { comments: { nodes: LinearComment[] } } }>(
    `query($id: String!) { issue(id: $id) { comments(first: 100) { nodes { id body createdAt user { name avatarUrl } } } } }`,
    { id: issueId },
  );
  return [...d.issue.comments.nodes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addIssueComment(issueId: string, body: string): Promise<LinearComment> {
  const d = await gql<{ commentCreate: { comment: LinearComment } }>(
    `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { comment { id body createdAt user { name avatarUrl } } } }`,
    { input: { issueId, body } },
  );
  return d.commentCreate.comment;
}

/** Put a link (e.g. the published post) on a Linear issue as an attachment. */
export async function attachLink(issueId: string, url: string, title: string): Promise<void> {
  await gql(`mutation($issueId: String!, $url: String!, $title: String) { attachmentLinkURL(issueId: $issueId, url: $url, title: $title) { success } }`, { issueId, url, title });
}
