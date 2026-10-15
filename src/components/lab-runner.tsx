"use client";

import { Wand2 } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "./action-button";

/** Run a lens, optionally steered ("something for GTA 6 week", "under $5k"). */
export function LabRunner({ lens, disabled }: { lens: string; disabled: boolean }) {
  const [steer, setSteer] = useState("");
  return (
    <div className="space-y-2">
      <input
        value={steer}
        onChange={(e) => setSteer(e.target.value)}
        placeholder="Optional steer, e.g. “under $5k”"
        disabled={disabled}
        className="h-8 w-full rounded-full bg-surface-3 px-3 text-[12.5px] outline-none placeholder:text-ink-3 disabled:opacity-50"
      />
      <ActionButton
        endpoint="/api/ideas"
        body={{ lens, steer: steer.trim() || undefined }}
        size="sm"
        pending="Inventing and critiquing…"
        icon={<Wand2 className="h-3.5 w-3.5" />}
        disabled={disabled}
        disabledReason={disabled ? "Needs the AI key" : undefined}
      >
        Invent
      </ActionButton>
    </div>
  );
}
