// Reads the CRM sheet and prints what would go into the calendar. Changes nothing.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { pullSheet } = await import("@/lib/integrations/sheet");
const r = await pullSheet();
console.log("Tabs read:", r.tabs.join(", "), "| rows needing SM:", r.items.length, "| skipped:", r.skipped);
for (const i of r.items) console.log(` ${i.date}  ${i.title.replace(/\n/g, " ").slice(0, 70)}  [${i.notes?.match(/Channels:\*\* ([^\n]+)/)?.[1] ?? ""}]`);
