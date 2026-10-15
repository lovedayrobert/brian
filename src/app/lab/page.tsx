import { FlaskConical } from "lucide-react";
import { IdeaCard } from "@/components/idea-card";
import { LabRunner } from "@/components/lab-runner";
import { PageHeader, SectionTitle } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { LENSES } from "@/lib/brand/lenses";
import { cards, keyVisualFor, load } from "@/lib/queries";

export const metadata = { title: "Opportunity Lab" };

export default async function Lab() {
  const db = await load();
  const ai = modelReady();
  const labIdeas = cards(db.ideas).filter((i) => i.origin === "lab");
  const killedCount = db.ideas.filter((i) => i.origin === "lab" && i.status === "killed").length;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" /> Opportunity Lab
          </span>
        }
        title="Ideas that don't start with a trend"
        subtitle="Trends tell you what everyone is looking at. The Lab invents ways to get Cashy in front of people that nobody has tried: stunts, collabs, parody drops, trolls, internet toys and deals so strange the deal is the story. Every lens is about shares and impressions, never about our product. Every idea faces the same Critic, red lines and prior-art check."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {LENSES.map((l) => {
          const n = labIdeas.filter((i) => i.lens === l.id).length;
          return (
            <div key={l.id} className="flex flex-col rounded-[18px] bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-semibold tracking-tight">{l.name}</div>
                {n > 0 && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">{n} idea{n === 1 ? "" : "s"}</span>}
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink-2">{l.tagline}</p>
              <ul className="mt-3 space-y-1 text-[12px] text-ink-3">
                {l.examples.map((e) => (
                  <li key={e}>· {e}</li>
                ))}
              </ul>
              <div className="mt-auto pt-4">
                <LabRunner lens={l.id} disabled={!ai} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">
        &ldquo;Without being restricted&rdquo; means finding channels and formats where a casino is allowed, or where nobody has looked yet. Ideas that only work by disguising gambling promotion to get past platform rules are flagged by Red Lines, because they lose accounts.
      </p>

      <section className="mt-12">
        <SectionTitle>From the Lab</SectionTitle>
        {labIdeas.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {labIdeas.map((i) => (
              <IdeaCard key={i.id} idea={i} keyVisualUrl={keyVisualFor(i.id, db.packages)} />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-line-strong px-6 py-10 text-center text-[13.5px] text-ink-2">
            {ai
              ? "Pick a lens and press Invent. Ten candidates, most killed by the Critic, the best two or three land here."
              : "The Lab needs the AI key. Add ANTHROPIC_API_KEY to switch it on."}
            {killedCount > 0 && <div className="mt-1 text-ink-3">{killedCount} Lab ideas killed so far; see Ideas.</div>}
          </div>
        )}
      </section>
    </>
  );
}
