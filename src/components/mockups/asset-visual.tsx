import clsx from "clsx";
import { ImageIcon } from "lucide-react";
import { formatById, type Palette, type VisualSpec } from "@/lib/brand/formats";

/**
 * Renders one asset's visual in its own format. Code formats are exact
 * layouts; image formats show the generated image, or the art direction
 * while no image model is connected. Cashy is present but small: the thing
 * itself is the content.
 */
const PAL: Record<Palette, { bg: string; ink: string; sub: string; accent: string; card: string }> = {
  night: { bg: "#0B0B0F", ink: "#FFFFFF", sub: "rgba(255,255,255,0.62)", accent: "#2BD96B", card: "#17171D" },
  paper: { bg: "#F3EEE4", ink: "#141414", sub: "rgba(20,20,20,0.6)", accent: "#E5372B", card: "#FFFFFF" },
  acid: { bg: "#D9FF3D", ink: "#0B0B0B", sub: "rgba(11,11,11,0.62)", accent: "#0B0B0B", card: "#F2FFC2" },
  candy: { bg: "#FF4FA3", ink: "#FFFFFF", sub: "rgba(255,255,255,0.75)", accent: "#FFE14D", card: "#FF7DBB" },
  mono: { bg: "#FFFFFF", ink: "#0A0A0A", sub: "rgba(10,10,10,0.55)", accent: "#0A0A0A", card: "#F2F2F2" },
};

function Mark({ color, className }: { color: string; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-[0.6cqw] font-bold uppercase tracking-[0.2em]", className)} style={{ color, fontSize: "clamp(7px,1.9cqw,13px)" }}>
      <span className="inline-block rounded-full" style={{ width: "1.4cqw", height: "1.4cqw", minWidth: 5, minHeight: 5, background: color }} />
      Cashy
    </span>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Pending({ spec, p }: { spec: VisualSpec; p: (typeof PAL)[Palette] }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-[5cqw]" style={{ background: `repeating-linear-gradient(135deg, ${p.card} 0 12px, ${p.bg} 12px 24px)` }}>
      <div className="rounded-[2cqw] p-[3.5cqw]" style={{ background: p.bg, color: p.ink }}>
        <div className="mb-[1.5cqw] flex items-center gap-[1cqw] font-semibold uppercase tracking-[0.12em]" style={{ fontSize: "clamp(7px,1.8cqw,12px)", color: p.sub }}>
          <ImageIcon style={{ width: "2.4cqw", height: "2.4cqw", minWidth: 10, minHeight: 10 }} /> {formatById(spec.format)?.name ?? "Image"} · generates with the image model
        </div>
        <div className="leading-snug" style={{ fontSize: "clamp(9px,2.6cqw,16px)" }}>
          {spec.artDirection}
        </div>
      </div>
    </div>
  );
}

export function AssetVisual({ spec, className, safeArea }: { spec: VisualSpec; className?: string; safeArea?: boolean }) {
  // Full-screen formats (stories, TikTok): keep the layout clear of the platform's own chrome.
  if (safeArea) {
    return (
      <div className={clsx(!className?.includes("absolute") && "relative", className)} style={{ background: (PAL[spec.palette] ?? PAL.night).bg, paddingTop: "22%", paddingBottom: "30%" }}>
        <AssetVisual spec={spec} className="h-full w-full" />
      </div>
    );
  }
  const p = PAL[spec.palette] ?? PAL.night;
  const fmt = formatById(spec.format);
  const lines = spec.lines.filter(Boolean);
  const base = clsx(!className?.includes("absolute") && "relative", "isolate overflow-hidden [container-type:inline-size]", className);
  const style = { background: p.bg, color: p.ink };

  // ---------- image formats ----------
  if (fmt?.kind === "image" || !fmt) {
    return (
      <div className={base} style={style}>
        {spec.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spec.imageUrl} alt={spec.artDirection} className="absolute inset-0 h-full w-full object-cover" />
            {spec.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-[4cqw] pt-[12cqw] font-semibold leading-tight text-white" style={{ fontSize: "clamp(10px,3.4cqw,22px)" }}>
                {spec.caption}
              </div>
            )}
            <Mark color="#FFFFFF" className="absolute right-[3cqw] top-[3cqw] opacity-80 drop-shadow" />
          </>
        ) : (
          <Pending spec={spec} p={p} />
        )}
      </div>
    );
  }

  switch (spec.format) {
    case "meme":
      return (
        <div className={base} style={{ background: "#000" }}>
          {spec.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={spec.imageUrl} alt={spec.artDirection} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Pending spec={{ ...spec, palette: "night" }} p={PAL.night} />
          )}
          {[spec.headline, lines[0]].map((t, i) =>
            t ? (
              <div
                key={i}
                className={clsx("absolute inset-x-[3cqw] text-center font-black uppercase leading-[1.02] text-white", i === 0 ? "top-[3cqw]" : "bottom-[3cqw]")}
                style={{ fontFamily: "Impact, 'Anton', 'Arial Black', sans-serif", fontSize: "clamp(14px,7cqw,54px)", WebkitTextStroke: "0.35cqw #000", paintOrder: "stroke fill" }}
              >
                {t}
              </div>
            ) : null,
          )}
          <Mark color="#FFFFFF" className="absolute bottom-[1.5cqw] right-[2cqw] opacity-60" />
        </div>
      );

    case "headline":
      return (
        <div className={base} style={{ background: "#FFFFFF", color: "#111" }}>
          <div className="flex h-full flex-col p-[5cqw]">
            <div className="flex items-baseline justify-between border-b-[0.4cqw] border-black pb-[1.5cqw]">
              <span className="font-serif font-black tracking-tight" style={{ fontSize: "clamp(12px,4.6cqw,30px)" }}>
                The Timeline
              </span>
              <span className="font-semibold uppercase tracking-[0.12em] text-[#c8102e]" style={{ fontSize: "clamp(7px,1.8cqw,12px)" }}>
                Breaking
              </span>
            </div>
            <h3 className="mt-[3cqw] font-serif font-bold leading-[1.05] tracking-tight" style={{ fontSize: "clamp(16px,6.4cqw,46px)" }}>
              {spec.headline}
            </h3>
            {lines[0] && (
              <p className="mt-[2cqw] leading-snug text-black/65" style={{ fontSize: "clamp(9px,2.7cqw,17px)" }}>
                {lines[0]}
              </p>
            )}
            <div className="relative mt-auto min-h-[22cqw] flex-1 overflow-hidden rounded-[1cqw]" style={{ background: "#e9e6df", marginTop: "3cqw" }}>
              {spec.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={spec.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <Pending spec={{ ...spec, palette: "paper" }} p={PAL.paper} />
              )}
            </div>
            <div className="mt-[1.5cqw] text-black/45" style={{ fontSize: "clamp(7px,1.7cqw,11px)" }}>
              {spec.caption ?? "Photo: handout"}
            </div>
          </div>
        </div>
      );

    case "notification": {
      const notes = (lines.length ? lines : [spec.headline]).slice(0, 4).map((l) => {
        const m = l.match(/^([^:]{1,24}):\s*(.+)$/);
        return m ? { app: m[1], text: m[2] } : { app: "Cashy", text: l };
      });
      return (
        <div className={base} style={{ background: `radial-gradient(120% 80% at 30% 10%, ${p.accent}55, transparent 60%), linear-gradient(160deg, ${p.bg}, #000)`, color: "#fff" }}>
          <div className="flex h-full flex-col items-center px-[5cqw] pt-[7cqw]">
            <div className="font-medium opacity-80" style={{ fontSize: "clamp(8px,2.4cqw,15px)" }}>
              Friday 13 November
            </div>
            <div className="font-semibold leading-none tracking-tight" style={{ fontSize: "clamp(30px,17cqw,120px)" }}>
              9:41
            </div>
            <div className="mt-auto w-full space-y-[1.8cqw] pb-[6cqw]">
              {notes.map((n, i) => (
                <div key={i} className="rounded-[3cqw] bg-white/22 p-[3cqw] backdrop-blur-xl" style={{ background: "rgba(255,255,255,0.18)" }}>
                  <div className="flex items-center gap-[1.5cqw] font-semibold opacity-80" style={{ fontSize: "clamp(7px,2cqw,12px)" }}>
                    <span className="grid place-items-center rounded-[1cqw] bg-white/90 font-black text-black" style={{ width: "4cqw", height: "4cqw", minWidth: 12, minHeight: 12, fontSize: "clamp(6px,2cqw,11px)" }}>
                      {n.app[0]}
                    </span>
                    {n.app.toUpperCase()}
                    <span className="ml-auto opacity-70">now</span>
                  </div>
                  <div className="mt-[1cqw] leading-snug" style={{ fontSize: "clamp(9px,2.8cqw,16px)" }}>
                    {n.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case "receipt": {
      const items = lines.slice(0, 6).map((l) => {
        const m = l.match(/^(.*?)\s*(?:\||—|-{2,}|\.{2,})\s*(\S+)$/);
        return m ? { label: m[1], price: m[2] } : { label: l, price: "" };
      });
      return (
        <div className={base} style={{ background: p.bg }}>
          <div className="absolute left-1/2 top-[3cqw] max-h-[94%] w-[62%] -translate-x-1/2 rotate-[-2deg] overflow-hidden bg-white px-[4.5cqw] py-[4cqw] font-mono text-black shadow-2xl" style={{ fontSize: "clamp(7px,2.1cqw,13px)", clipPath: "polygon(0 0,100% 0,100% 97%,95% 100%,90% 97%,85% 100%,80% 97%,75% 100%,70% 97%,65% 100%,60% 97%,55% 100%,50% 97%,45% 100%,40% 97%,35% 100%,30% 97%,25% 100%,20% 97%,15% 100%,10% 97%,5% 100%,0 97%)" }}>
            <div className="text-center font-bold uppercase tracking-[0.2em]">Cashy</div>
            <div className="mt-[1cqw] text-center opacity-60">#000{hash(spec.headline) % 9000 + 1000} · 13/11 21:47</div>
            <div className="my-[2.5cqw] border-t border-dashed border-black/50" />
            <div className="text-center font-bold uppercase leading-tight">{spec.headline}</div>
            <div className="my-[2.5cqw] border-t border-dashed border-black/50" />
            {items.map((it, i) => (
              <div key={i} className="flex justify-between gap-[2cqw] leading-relaxed">
                <span className="truncate">{it.label}</span>
                <span>{it.price}</span>
              </div>
            ))}
            <div className="my-[2.5cqw] border-t border-dashed border-black/50" />
            <div className="flex justify-between font-bold">
              <span>TOTAL</span>
              <span>{spec.caption ?? "PRICELESS"}</span>
            </div>
            <div className="mt-[3cqw] text-center opacity-60">THANK YOU · NO REFUNDS</div>
          </div>
        </div>
      );
    }

    case "document":
      return (
        <div className={base} style={{ background: p.bg }}>
          <div className="absolute inset-[5cqw] bg-[#FBF8F1] px-[6cqw] py-[5cqw] text-[#1b1b1b] shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/15 pb-[2cqw]">
              <Mark color="#1b1b1b" />
              <span className="font-mono opacity-50" style={{ fontSize: "clamp(7px,1.7cqw,11px)" }}>
                REF. C-{hash(spec.headline) % 90000 + 10000}
              </span>
            </div>
            <div className="mt-[4cqw] text-center font-serif font-bold uppercase tracking-[0.08em]" style={{ fontSize: "clamp(12px,4.4cqw,30px)" }}>
              {spec.headline}
            </div>
            <div className="mt-[3cqw] space-y-[1.4cqw] font-serif leading-snug" style={{ fontSize: "clamp(8px,2.5cqw,15px)" }}>
              {lines.slice(0, 4).map((l, i) => (
                <p key={i} className="line-clamp-3">
                  {l}
                </p>
              ))}
            </div>
            <div className="absolute bottom-[5cqw] left-[6cqw] right-[6cqw] flex items-end justify-between">
              <div>
                <svg viewBox="0 0 120 40" style={{ width: "22cqw" }} aria-hidden>
                  <path d="M4 30 C 20 4, 30 40, 44 18 S 70 8, 78 26 S 100 30, 116 10" fill="none" stroke="#1b2a6b" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <div className="border-t border-black/40 pt-[0.6cqw] font-serif opacity-70" style={{ fontSize: "clamp(7px,1.7cqw,11px)" }}>
                  {spec.caption ?? "For and on behalf of Cashy"}
                </div>
              </div>
              <div className="grid place-items-center rounded-full border-[0.5cqw] text-center font-bold uppercase leading-tight" style={{ width: "16cqw", height: "16cqw", borderColor: "#b3261e", color: "#b3261e", fontSize: "clamp(6px,1.6cqw,10px)", transform: "rotate(-12deg)" }}>
                Official
                <br />
                Seal
              </div>
            </div>
          </div>
        </div>
      );

    case "chat": {
      const msgs = (lines.length ? lines : [spec.headline]).slice(0, 7).map((l, i) => {
        const m = l.match(/^([^:]{1,18}):\s*(.+)$/);
        return { who: m ? m[1] : i % 2 ? "You" : "Group", text: m ? m[2] : l };
      });
      const me = msgs.find((m) => /^(you|me)$/i.test(m.who))?.who ?? "You";
      return (
        <div className={base} style={{ background: "#ffffff", color: "#000" }}>
          <div className="border-b border-black/10 py-[2.5cqw] text-center font-semibold" style={{ fontSize: "clamp(9px,2.8cqw,16px)" }}>
            {spec.headline}
          </div>
          <div className="space-y-[1.6cqw] p-[4cqw]">
            {msgs.map((m, i) => {
              const mine = m.who === me;
              return (
                <div key={i} className={clsx("flex flex-col", mine ? "items-end" : "items-start")}>
                  {!mine && (
                    <span className="mb-[0.4cqw] ml-[2cqw] text-black/45" style={{ fontSize: "clamp(7px,1.8cqw,11px)" }}>
                      {m.who}
                    </span>
                  )}
                  <span className={clsx("max-w-[78%] rounded-[4cqw] px-[3cqw] py-[1.6cqw] leading-snug", mine ? "bg-[#0A84FF] text-white" : "bg-[#E9E9EB]")} style={{ fontSize: "clamp(9px,2.8cqw,16px)" }}>
                    {m.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "ticket":
      return (
        <div className={base} style={{ background: p.bg }}>
          <div className="absolute inset-x-[6cqw] top-1/2 flex -translate-y-1/2 overflow-hidden rounded-[2.5cqw] shadow-2xl" style={{ background: p.card, color: p.ink }}>
            <div className="flex-1 p-[4cqw]">
              <Mark color={p.accent === p.ink ? p.ink : p.accent} />
              <div className="mt-[2cqw] font-black uppercase leading-[0.95] tracking-tight" style={{ fontSize: "clamp(14px,6cqw,42px)" }}>
                {spec.headline}
              </div>
              <div className="mt-[3cqw] grid grid-cols-2 gap-[2cqw]" style={{ fontSize: "clamp(7px,2cqw,12px)" }}>
                {lines.slice(0, 4).map((l, i) => {
                  const [k, v] = l.includes(":") ? l.split(/:(.+)/) : ["", l];
                  return (
                    <div key={i}>
                      <div className="uppercase tracking-[0.12em]" style={{ color: p.sub }}>
                        {k || "Note"}
                      </div>
                      <div className="font-semibold">{v}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex w-[22%] flex-col items-center justify-center border-l-[0.5cqw] border-dashed p-[2cqw]" style={{ borderColor: p.bg }}>
              <div className="font-mono font-bold [writing-mode:vertical-rl]" style={{ fontSize: "clamp(8px,2.4cqw,15px)" }}>
                ADMIT ONE · No. {hash(spec.headline) % 900 + 100}
              </div>
            </div>
          </div>
        </div>
      );

    case "screen":
      return (
        <div className={base} style={{ background: p.bg }}>
          <div className="absolute inset-[5cqw] overflow-hidden rounded-[2cqw] bg-white text-black shadow-2xl">
            <div className="flex items-center gap-[1cqw] border-b border-black/10 bg-[#f4f4f6] px-[2.5cqw] py-[1.6cqw]">
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <span key={c} className="rounded-full" style={{ width: "1.6cqw", height: "1.6cqw", minWidth: 5, minHeight: 5, background: c }} />
              ))}
              <span className="mx-auto truncate rounded-[1cqw] bg-white px-[3cqw] py-[0.5cqw] text-black/50" style={{ fontSize: "clamp(7px,1.8cqw,11px)" }}>
                {spec.caption ?? "cashy.com"}
              </span>
            </div>
            <div className="p-[4cqw]">
              <div className="font-bold leading-tight tracking-tight" style={{ fontSize: "clamp(13px,5cqw,34px)" }}>
                {spec.headline}
              </div>
              <div className="mt-[3cqw] space-y-[1.6cqw]">
                {lines.slice(0, 4).map((l, i) => (
                  <div key={i} className={clsx("line-clamp-2 rounded-[1.6cqw] px-[3cqw] py-[1.6cqw]", i === Math.min(lines.length, 4) - 1 ? "text-center font-semibold" : "bg-[#f4f4f6]")} style={{ fontSize: "clamp(7px,2.2cqw,14px)", background: i === Math.min(lines.length, 4) - 1 ? p.accent === "#FFFFFF" ? "#0A0A0A" : p.accent : undefined, color: i === Math.min(lines.length, 4) - 1 ? (p.accent === "#D9FF3D" || p.accent === "#FFE14D" || p.accent === "#2BD96B" ? "#000" : "#fff") : undefined }}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <Mark color="#0A0A0A" className="absolute bottom-[2.5cqw] right-[3cqw] opacity-40" />
          </div>
        </div>
      );

    case "quote":
      return (
        <div className={base} style={style}>
          <div className="flex h-full flex-col justify-center p-[7cqw]">
            <div className="font-serif leading-none" style={{ fontSize: "clamp(40px,22cqw,160px)", color: p.accent, height: "11cqw" }}>
              &ldquo;
            </div>
            <div className="font-semibold leading-[1.08] tracking-tight" style={{ fontSize: "clamp(16px,7cqw,52px)" }}>
              {spec.headline}
            </div>
            <div className="mt-[4cqw]" style={{ color: p.sub, fontSize: "clamp(8px,2.6cqw,16px)" }}>
              {spec.caption ?? lines[0] ?? "— the timeline"}
            </div>
          </div>
          <Mark color={p.ink} className="absolute bottom-[4cqw] right-[5cqw] opacity-60" />
        </div>
      );

    default: {
      // poster: layout varies with the idea so two posters never look identical
      const layout = hash(spec.headline) % 3;
      return (
        <div className={base} style={style}>
          <div className={clsx("flex h-full flex-col p-[6cqw]", layout === 1 ? "items-center justify-center text-center" : layout === 2 ? "justify-end" : "justify-start")}>
            {lines[0] && (
              <div className="mb-[3cqw] font-semibold uppercase tracking-[0.16em]" style={{ color: p.accent === p.ink ? p.sub : p.accent, fontSize: "clamp(8px,2.2cqw,14px)" }}>
                {lines[0]}
              </div>
            )}
            <div className="font-black uppercase leading-[0.88] tracking-[-0.04em]" style={{ fontSize: layout === 1 ? "clamp(22px,11cqw,90px)" : "clamp(24px,13cqw,104px)" }}>
              {spec.headline}
            </div>
            {spec.caption && (
              <div className="mt-[4cqw] max-w-[80%]" style={{ color: p.sub, fontSize: "clamp(9px,2.6cqw,16px)" }}>
                {spec.caption}
              </div>
            )}
          </div>
          <Mark color={p.ink} className="absolute bottom-[4cqw] right-[5cqw] opacity-70" />
        </div>
      );
    }
  }
}
