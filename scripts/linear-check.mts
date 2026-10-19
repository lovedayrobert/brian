// Read-only check that Linear is connected: lists teams, labels, projects, people and dated issues. Changes nothing.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { linearMeta, issuesInRange, unscheduledIssues } = await import("@/lib/integrations/linear");
const meta = await linearMeta(true);
console.log("Teams:", meta.teams.map((t) => `${t.key} (${t.states.length} states)`).join(", "));
console.log("Default team:", meta.teams.find((t) => t.id === meta.defaultTeamId)?.key);
console.log("Labels:", meta.labels.length, "| e.g.", meta.labels.slice(0, 8).map((l) => l.name).join(", "));
console.log("Projects:", meta.projects.length, "| People:", meta.users.length);
const today = new Date().toISOString().slice(0, 10);
const from = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10);
const to = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
const issues = await issuesInRange(from, to);
console.log(`Issues due ${from} to ${to}:`, issues.length);
for (const i of issues.slice(0, 8)) console.log(`  ${i.dueDate} ${i.identifier} [${i.state.name}] ${i.title}${i.labels.nodes.length ? ` · ${i.labels.nodes.map((l) => l.name).join(", ")}` : ""}`);
console.log("Open issues with no due date:", (await unscheduledIssues()).length, "| today:", today);
