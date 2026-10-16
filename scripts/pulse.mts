// Read the room: npm-free runner for the Pulse agent.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { readPulse } = await import("@/lib/pipeline/pulse");
const p = await readPulse();
console.log(`MOOD: ${p.mood}\nVILLAIN: ${p.villain}\nMAIN CHARACTER: ${p.mainCharacter}\n`);
for (const i of p.items) console.log(`[${i.emotion} ${i.intensity}] ${i.subject}: ${i.why}`);
