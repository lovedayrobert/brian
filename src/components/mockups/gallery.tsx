"use client";

import clsx from "clsx";
import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import type { Creative } from "@/lib/pipeline/package-schemas";
import { formatById, type VisualSpec } from "@/lib/brand/formats";
import { AssetVisual } from "./asset-visual";
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

type AssetKey = "x" | "ig" | "carousel" | "story" | "tiktok" | "landing" | "telegram" | "discord" | "storyboard";

const ASSETS: { key: AssetKey; label: string; spec: string }[] = [
  { key: "x", label: "X post and thread", spec: "1600×900 image · 280 chars" },
  { key: "ig", label: "Instagram feed", spec: "1080×1080 · caption ≤ 2,200" },
  { key: "carousel", label: "Instagram carousel", spec: "1080×1080 × slides" },
  { key: "story", label: "Instagram story", spec: "1080×1920 · 15s per frame" },
  { key: "tiktok", label: "TikTok", spec: "1080×1920 · 20–40s" },
  { key: "landing", label: "Landing page", spec: "Responsive · desktop and mobile" },
  { key: "telegram", label: "Telegram", spec: "1280×800 image + post" },
  { key: "discord", label: "Discord", spec: "Announcement message" },
  { key: "storyboard", label: "Video storyboard", spec: "6 frames · teaser on demand" },
];

export interface StoryboardFrame {
  frame: number;
  prompt: string;
  imageUrl: string | null;
}

export function MockupGallery({
  creative,
  keyVisualUrl,
  ideaName,
  compact,
  visuals,
  storyboardFrames,
  teaserUrl,
}: {
  creative: Creative;
  keyVisualUrl: string | null;
  ideaName: string;
  compact?: boolean;
  visuals?: VisualSpec[];
  storyboardFrames?: StoryboardFrame[];
  teaserUrl?: string | null;
}) {
  const [active, setActive] = useState<AssetKey>("x");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const line = creative.keyVisual.heroLine || ideaName;
  const c = creative.copy;
  const v = (k: string) => visuals?.find((x) => x.asset === k);
  const current = v(active);
  const fmt = current ? formatById(current.format) : null;

  return (
    <div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {ASSETS.filter((a) => (a.key !== "landing" || !!c.landing.headline) && (a.key !== "storyboard" || creative.video.storyboard.length > 0)).map((a) => (
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
        {active === "x" && <XPost text={c.x.post} thread={c.x.thread} keyVisualUrl={keyVisualUrl} line={line} spec={v("x")} />}
        {active === "ig" && <InstagramPost caption={c.instagram.caption} keyVisualUrl={keyVisualUrl} line={line} slides={c.instagram.carousel} spec={v("ig")} />}
        {active === "carousel" && <CarouselStrip slides={c.instagram.carousel} line={line} spec={v("carousel")} />}
        {active === "story" && <InstagramStory frames={c.instagram.story} keyVisualUrl={keyVisualUrl} line={line} spec={v("story")} />}
        {active === "tiktok" && (
          <div className="grid items-start gap-6 md:grid-cols-[300px_1fr]">
            <TikTokFrame hook={c.tiktok.hook} caption={c.tiktok.caption} keyVisualUrl={keyVisualUrl} line={line} spec={v("tiktok")} />
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
                <LandingPage copy={c.landing} keyVisualUrl={keyVisualUrl} line={line} spec={v("landing")} />
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
        {active === "telegram" && <TelegramPost text={c.telegram} keyVisualUrl={keyVisualUrl} line={line} spec={v("telegram")} />}
        {active === "storyboard" && (
          <div className="space-y-5">
            {teaserUrl && (
              <video src={teaserUrl} controls playsInline className="mx-auto w-full max-w-[640px] rounded-[14px] bg-black shadow-float" />
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {creative.video.storyboard.map((f) => {
                const frame = storyboardFrames?.find((x) => x.frame === f.frame);
                return (
                  <div key={f.frame} className="overflow-hidden rounded-[14px] bg-surface shadow-card">
                    <AssetVisual
                      className="aspect-video w-full"
                      spec={{ asset: "x", format: "photo", headline: f.shot, lines: [], caption: null, artDirection: frame?.prompt ?? f.visual, imagePrompt: frame?.prompt ?? null, palette: "night", imageUrl: frame?.imageUrl ?? null }}
                    />
                    <div className="p-3 text-[12.5px]">
                      <div className="font-medium">
                        {f.frame}. {f.shot}
                      </div>
                      <div className="mt-1 text-ink-2">{f.audio}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {active === "discord" && <DiscordMessage text={c.discord} spec={v("discord")} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-3">
        <span>{ASSETS.find((a) => a.key === active)?.spec}</span>
        <span>
          {current && fmt
            ? `Format: ${fmt.name} · ${fmt.kind === "code" ? "exact layout" : current.imageUrl ? `generated (${current.imageModel ?? "image model"})` : "image generates when fal.ai is connected"}`
            : visuals?.length
              ? ""
              : keyVisualUrl
                ? "Key visual: generated image"
                : "Shared placeholder visual (package made before the Art Director)"}
        </span>
      </div>
    </div>
  );
}
