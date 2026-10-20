"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

/** What the brand can actually do. Admins edit; everyone can read it. */
export function ToolkitForm({ brandId, initial, canEdit }: { brandId: string; initial: string; canEdit: boolean }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/toolkit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId, text }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't save");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} readOnly={!canEdit} rows={9} className="w-full rounded-[12px] bg-surface-3 px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none" />
      {canEdit && (
        <div className="mt-2 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bg disabled:opacity-50">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </button>
          {saved && <span className="text-[12.5px] text-good">Saved. Every idea run uses it from now on.</span>}
          {error && <span className="text-[12.5px] text-bad">{error}</span>}
        </div>
      )}
    </div>
  );
}
