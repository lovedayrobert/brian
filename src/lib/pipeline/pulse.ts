import * as z from "zod/v4";
import { callStructured } from "@/lib/adapters/model";
import { EMOTIONS } from "@/lib/brand/quality-bar";
import type { Moment, Pulse, Signal } from "@/lib/domain/types";
import { memoryForRun } from "@/lib/memory";
import { newId, repo } from "@/lib/store";

/**
 * The Pulse reads the room before anyone invents anything: what the audience
 * is watching, sharing and arguing about right now, and the feeling that
 * drives each thing (hate, outrage, wtf, schadenfreude…). One Sonnet call over
 * the latest sweep, roughly $0.05-0.10. The Inventor gets the latest reading.
 */
const PulseOut = z.object({
  mood: z.string().describe("Two or three sentences: what the audience is into, sick of and laughing at this week, in plain words"),
  villain: z.string().nullable().describe("The person, brand or thing the audience most loves to hate right now, and why, in one line. null if nobody stands out"),
  mainCharacter: z.string().nullable().describe("Who or what the internet is obsessed with today, in one line"),
  items: z.array(
    z.object({
      subject: z.string().describe("The person, thing, clip, behaviour or story, named plainly"),
      happening: z.string().describe("What's going on, in one line"),
      emotion: z.enum(EMOTIONS.map((e) => e.id) as [string, ...string[]]),
      intensity: z.number().describe("1-10: how strongly people feel it"),
      why: z.string().describe("The human reason people are watching or sharing it: what it lets them feel or say about themselves"),
      where: z.string().describe("Which communities are talking about it"),
      lifespan: z.string().describe("How long the feeling will last: hours, days, weeks"),
      opening: z.string().nullable().describe("One line on the kind of act a brand could aim at this feeling, or null if it's off-limits (tragedy, minors, hate)"),
      urls: z.array(z.string()).describe("Source URLs from the list, exactly as given"),
    }),
  ),
});

function feed(signals: Signal[], moments: Moment[]): { text: string; urls: Set<string>; count: number } {
  const pick = (f: (s: Signal) => boolean, n: number) => signals.filter(f).slice(0, n);
  const rows: Signal[] = [
    ...pick((s) => s.sourceId.startsWith("ext:"), 60),
    ...pick((s) => s.sourceId === "audience", 120),
    ...pick((s) => s.sourceId === "press" && !s.topics.includes("trade"), 40),
    ...pick((s) => s.sourceId === "youtube", 20),
    ...pick((s) => s.sourceId === "trenches" && s.narrative?.kind === "culture", 10),
    ...pick((s) => s.sourceId === "builds", 10),
  ];
  const breaking = moments.filter((m) => m.kind === "breaking" && !m.industry).slice(0, 25);
  const urls = new Set([...rows.map((s) => s.url), ...breaking.flatMap((m) => (m.sourceUrl ? [m.sourceUrl] : []))]);
  const text = [
    ...rows.map((s) => `- [${s.author ?? s.sourceId}${s.metric ? `, ${s.metric.label.toLowerCase()} ${s.metric.value.toLocaleString("en-US")}` : ""}] ${s.title}${s.summary ? ` — ${s.summary.slice(0, 160)}` : ""} ${s.url}`),
    ...breaking.map((m) => `- [news, ${m.outlets} outlets] ${m.title} ${m.sourceUrl ?? ""}`),
  ].join("\n");
  return { text, urls, count: rows.length + breaking.length };
}

export async function readPulse(brandId = "cashy" as const): Promise<Pulse> {
  const db = await repo.read();
  const { text, urls, count } = feed(db.signals, db.moments);
  if (count < 10) throw new Error("Not enough signals to read the room. Run a sweep first.");
  const out = await callStructured({
    agent: "pulse",
    subject: "Reading the room",
    schema: PulseOut,
    system: [
      await memoryForRun(brandId, "reading what the audience is consuming"),
      "You are the Pulse at Brian. You read the internet the way a sharp 23-year-old who's online all day does: on crypto Twitter, Kick, streamer drama, betting and degen communities, TikTok. Your job is not to list news. It's to say what people are actually watching, sharing and arguing about, and above all WHY: the feeling it lets them have. Who do they love to hate this week? What made them say 'wtf'? Whose downfall are they enjoying? What are they tribal about? Be blunt and specific: name people and things. Ignore corporate, trade and regulation news unless people are genuinely reacting to it. Skip real tragedies, deaths, disasters and anything involving minors (list them with opening null if they dominate). Only cite URLs from the list.",
      `Feelings to tag with:\n${EMOTIONS.map((e) => `- [${e.id}] ${e.name}: ${e.why}`).join("\n")}`,
    ].join("\n\n"),
    prompt: `<feed note="What the audience is consuming right now, from the latest sweep. Ranks and counts show attention.">\n${text}\n</feed>\n\nRead the room. Give 12-20 items, strongest feeling first. Merge items about the same subject.`,
  });
  const pulse: Pulse = {
    id: newId("pulse"),
    createdAt: new Date().toISOString(),
    mood: out.mood,
    villain: out.villain,
    mainCharacter: out.mainCharacter,
    items: out.items
      .map((i) => ({ ...i, intensity: Math.max(1, Math.min(10, Math.round(i.intensity))), urls: i.urls.filter((u) => urls.has(u)) }))
      .sort((a, b) => b.intensity - a.intensity),
    signalCount: count,
  };
  await repo.update((d) => {
    d.pulses = [pulse, ...(d.pulses ?? [])].slice(0, 20);
  });
  return pulse;
}

/** The reading the Inventor works from: the latest, if it's from the last 48 hours. */
export function pulseContext(pulses: Pulse[] | undefined): string {
  const p = pulses?.[0];
  if (!p || Date.now() - new Date(p.createdAt).getTime() > 48 * 3_600_000) return "";
  return `<pulse read_at="${p.createdAt}" note="What the audience feels right now. Aim at these feelings.">
Mood: ${p.mood}
Villain of the week: ${p.villain ?? "none stands out"}
Main character: ${p.mainCharacter ?? "none"}
${p.items.map((i) => `- ${i.subject} [${i.emotion}, ${i.intensity}/10]: ${i.happening} Why people care: ${i.why} (${i.where}; lasts ${i.lifespan})${i.opening ? ` Opening: ${i.opening}` : ""} ${i.urls.join(" ")}`).join("\n")}
</pulse>`;
}
