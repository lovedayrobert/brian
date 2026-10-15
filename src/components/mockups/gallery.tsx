"use client";

import clsx from "clsx";
import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import type { Creative } from "@/lib/pipeline/package-schemas";
import {
  BrowserFrame,
  CarouselStrip,
  DiscordMessage,
  InstagramPost,
  InstagramStory,
  LandingPage,
  PhoneFrame,
  TelegramPost,
  TikTokFrame,
  XPost,
} from "./frames";

type AssetKey = "x" | "ig" | "carousel" | "story" | "tiktok" | "landing" | "telegram" | "discord";

const ASSETS: { key: AssetKey; label: string; spec: string }[] = [
  { key: "x", label: "X post and thread", spec: "1600×900 image · 280 chars" },
  { key: "ig", label: "Instagram feed", spec: "1080×1080 · caption ≤ 2,200" },
  { key: "carousel", label: "Instagram carousel", spec: "1080×1080 × slides" },
  { key: "story", label: "Instagram story", spec: "1080×1920 · 15s per frame" },
  { key: "tiktok", label: "TikTok", spec: "1080×1920 · 20–40s" },
  { key: "landing", label: "Landing page", spec: "Responsive · desktop and mobile" },
  { key: "telegram", label: "Telegram", spec: "1280×800 image + post" },
  { key: "discord", label: "Discord", spec: "Announcement message" },
];

export function MockupGallery({
  creative,
  keyVisualUrl,
  ideaName,
  compact,
}: {
  creative: Creative;
  keyVisualUrl: string | null;
  ideaName: string;
  compact?: boolean;
}) {
  const [active, setActive] = useState<AssetKey>("x");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const line = creative.keyVisual.heroLine || ideaName;
  const c = creative.copy;

  return (
    <div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {ASSETS.map((a) => (
          <button
            key={a.key}
            onClick={() => setActive(a.key)}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition",
              active === a.key ? "bg-ink text-bg" : "bg-surface-3 text-ink-2 hover:text-ink",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className={clsx("rounded-[20px] bg-surface-3/60 p-4 sm:p-8", compact ? "min-h-[420px]" : "min-h-[640px]")}>
        {active === "x" && <XPost text={c.x.post} thread={c.x.thread} keyVisualUrl={keyVisualUrl} line={line} />}
        {active === "ig" && <InstagramPost caption={c.instagram.caption} keyVisualUrl={keyVisualUrl} line={line} slides={c.instagram.carousel} />}
        {active === "carousel" && <CarouselStrip slides={c.instagram.carousel} line={line} />}
        {active === "story" && <InstagramStory frames={c.instagram.story} keyVisualUrl={keyVisualUrl} line={line} />}
        {active === "tiktok" && (
          <div className="grid items-start gap-6 md:grid-cols-[300px_1fr]">
            <TikTokFrame hook={c.tiktok.hook} caption={c.tiktok.caption} keyVisualUrl={keyVisualUrl} line={line} />
            <div className="rounded-[14px] bg-surface p-4 shadow-card">
              <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">Script</div>
              <div className="divide-y divide-line text-[13px]">
                {c.tiktok.script.map((s, i) => (
                  <div key={i} className="grid grid-cols-[52px_1fr] gap-3 py-2.5">
                    <span className="tabular font-semibold text-ink-2">{s.time}</span>
                    <div>
                      <div>{s.visual}</div>
                      <div className="mt-1 text-ink-2">VO: {s.voiceover}</div>
                      <div className="mt-0.5 text-ink-3">On screen: {s.onScreenText}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {active === "landing" && (
          <div>
            <div className="mb-4 flex justify-center gap-1 rounded-full bg-surface p-1 shadow-card sm:mx-auto sm:w-fit">
              {(["desktop", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px]", device === d ? "bg-ink text-bg" : "text-ink-2")}
                >
                  {d === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            {device === "desktop" ? (
              <BrowserFrame url="cashy.com/campaign">
                <LandingPage copy={c.landing} keyVisualUrl={keyVisualUrl} line={line} />
              </BrowserFrame>
            ) : (
              <PhoneFrame dark>
                <div className="h-full overflow-y-auto pt-[40px] scrollbar-none">
                  <LandingPage copy={c.landing} keyVisualUrl={keyVisualUrl} mobile />
                </div>
              </PhoneFrame>
            )}
          </div>
        )}
        {active === "telegram" && <TelegramPost text={c.telegram} keyVisualUrl={keyVisualUrl} line={line} />}
        {active === "discord" && <DiscordMessage text={c.discord} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-3">
        <span>{ASSETS.find((a) => a.key === active)?.spec}</span>
        <span>{keyVisualUrl ? "Key visual: generated image" : "Key visual: code-built from brand tokens (image model not connected)"}</span>
      </div>
    </div>
  );
}
