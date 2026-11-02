"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Step 3, Ideas: Brian's ideas for this campaign, built from its own Brian plus
 * the main Brian's instincts and aimed at the brief. (One-by-one review is next.)
 */
export function IdeasStep({ campaign, ai, learned, ideas }: { campaign: { id: string; name: string; moment?: string }; ai: boolean; learned: number; ideas: React.ReactNode[] }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getIdeas() {
    setRunning(true);
    setError(null);
    const res = await fetch("/api/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id }) });
    const json = await res.json().catch(() => ({}));
    setRunning(false);
    if (!res.ok) return setError(json.error ?? "Couldn't get ideas just now.");
    router.refresh();
  }

  return (
    <div>
      <h2 className="display text-[28px] leading-tight">Ideas</h2>
      <p className="mt-1.5 max-w-[620px] text-[15px] leading-relaxed text-ink-2">
        Built from what {campaign.name}&rsquo;s Brian has learned ({learned} lesson{learned === 1 ? "" : "s"}) and the main Brian&rsquo;s instincts, aimed at the brief{campaign.moment ? ` and the next ${campaign.moment}` : ""}.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[24px] bg-surface p-6 shadow-card">
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">{ideas.length ? "Want more?" : "Ready when you are"}</p>
          <p className="mt-1 text-[14px] text-ink-2">Brian comes up with a batch, his audience panel throws out the weak ones, and you see the rest. A minute or two, about $0.70–1.50.</p>
        </div>
        <button disabled={running || !ai} onClick={getIdeas} className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-bg shadow-card transition hover:opacity-90 disabled:opacity-40">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {running ? "Brian is thinking…" : "Get ideas"}
        </button>
        {error && <p className="w-full text-[14px] text-bad">{error}</p>}
      </div>
      {ideas.length === 0 ? (
        <p className="mt-6 rounded-[18px] border border-dashed border-line-strong p-6 text-[14px] text-ink-3">No ideas yet. They&rsquo;re only as good as what this campaign&rsquo;s Brian has learned, so do some research first.</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{ideas}</div>
      )}
    </div>
  );
}
