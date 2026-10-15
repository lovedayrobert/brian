/* Platform frames, built as code so text, spacing and chrome are exact.
   Each renders at the platform's real proportions. Handles and avatars use
   the brand's own account; no real third-party people appear. */

import clsx from "clsx";
import { BadgeCheck, Bookmark, Heart, MessageCircle, Music2, Repeat2, Send, Share, BarChart2, MoreHorizontal, Plus } from "lucide-react";
import { BRANDS } from "@/lib/brand/brands";
import { KeyVisual } from "./key-visual";

const B = BRANDS.cashy;

function Avatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-bold"
      style={{ width: size, height: size, background: B.visual.primary, color: B.visual.accent, fontSize: size * 0.42 }}
    >
      C
    </div>
  );
}

export function PhoneFrame({ children, className, dark }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={clsx("relative mx-auto w-full max-w-[300px] rounded-[44px] bg-[#1d1d1f] p-[9px] shadow-float", className)}>
      <div className={clsx("relative aspect-[9/19.5] overflow-hidden rounded-[36px]", dark ? "bg-black text-white" : "bg-white text-black")}>
        <div className="absolute left-1/2 top-[9px] z-20 h-[26px] w-[90px] -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

function StatusBar({ dark }: { dark?: boolean }) {
  return (
    <div className={clsx("flex h-[44px] items-end justify-between px-6 pb-1 text-[12px] font-semibold", dark ? "text-white" : "text-black")}>
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <span className="h-[9px] w-[16px] rounded-[2px] border border-current" />
      </span>
    </div>
  );
}

/* ---------- X ---------- */

function Tweet({ body, media, line, keyVisualUrl }: { body: string; media?: boolean; line: string; keyVisualUrl: string | null }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <Avatar />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[14px]">
          <span className="font-bold">{B.name}</span>
          <BadgeCheck className="h-4 w-4 fill-[#1d9bf0] text-white" />
          <span className="text-[#536471]">@cashy · 1m</span>
          <MoreHorizontal className="ml-auto h-4 w-4 text-[#536471]" />
        </div>
        <p className="mt-0.5 whitespace-pre-line text-[15px] leading-[1.35]">{body}</p>
        {media && (
          <div className="mt-3 overflow-hidden rounded-[16px] border border-[#cfd9de]">
            <KeyVisual line={line} imageUrl={keyVisualUrl} className="aspect-[16/9] w-full" compact />
          </div>
        )}
        <div className="mt-3 flex max-w-[400px] justify-between text-[#536471]">
          <MessageCircle className="h-[17px] w-[17px]" />
          <Repeat2 className="h-[17px] w-[17px]" />
          <Heart className="h-[17px] w-[17px]" />
          <BarChart2 className="h-[17px] w-[17px]" />
          <Share className="h-[17px] w-[17px]" />
        </div>
      </div>
    </div>
  );
}

export function XPost({ text, keyVisualUrl, line, thread }: { text: string; keyVisualUrl: string | null; line: string; thread?: string[] }) {
  return (
    <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[16px] border border-[#eff3f4] bg-white text-[#0f1419] shadow-raised [font-family:-apple-system,'Segoe_UI',Roboto,sans-serif]">
      <Tweet body={text} media line={line} keyVisualUrl={keyVisualUrl} />
      {thread?.slice(0, 3).map((t, i) => (
        <div key={i} className="border-t border-[#eff3f4]">
          <Tweet body={t} line={line} keyVisualUrl={keyVisualUrl} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Instagram feed + carousel ---------- */

export function InstagramPost({
  caption,
  keyVisualUrl,
  line,
  slides,
}: {
  caption: string;
  keyVisualUrl: string | null;
  line: string;
  slides?: { headline: string; body: string }[];
}) {
  return (
    <PhoneFrame>
      <StatusBar />
      <div className="flex items-center justify-between px-3 pb-2 text-[18px] font-semibold [font-family:'Billabong',cursive]">
        <span className="font-sans text-[17px] font-bold tracking-tight">Instagram</span>
        <span className="flex gap-3">
          <Heart className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <Avatar size={30} />
        <span className="text-[13px] font-semibold">cashy</span>
        <MoreHorizontal className="ml-auto h-4 w-4" />
      </div>
      <div className="relative">
        <KeyVisual line={line} imageUrl={keyVisualUrl} className="aspect-square w-full" aspect="square" />
        {slides && slides.length > 1 && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">1/{slides.length}</span>
        )}
      </div>
      <div className="flex items-center gap-3.5 px-3 pt-2.5">
        <Heart className="h-[22px] w-[22px]" />
        <MessageCircle className="h-[22px] w-[22px]" />
        <Send className="h-[22px] w-[22px]" />
        {slides && slides.length > 1 && (
          <span className="mx-auto flex gap-1">
            {slides.map((_, i) => (
              <span key={i} className={clsx("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-[#0095f6]" : "bg-black/20")} />
            ))}
          </span>
        )}
        <Bookmark className="ml-auto h-[22px] w-[22px]" />
      </div>
      <p className="line-clamp-4 px-3 pt-2 text-[12.5px] leading-snug">
        <span className="font-semibold">cashy </span>
        {caption}
      </p>
    </PhoneFrame>
  );
}

export function CarouselStrip({ slides, line }: { slides: { headline: string; body: string }[]; line: string }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {slides.map((s, i) => (
        <div
          key={i}
          className="relative aspect-square w-[220px] shrink-0 overflow-hidden rounded-[14px] p-5 [container-type:inline-size]"
          style={{ background: i === 0 ? B.visual.primary : B.visual.surface, color: B.visual.ink }}
        >
          {i === 0 ? (
            <KeyVisual line={line} className="absolute inset-0" compact />
          ) : (
            <div className="flex h-full flex-col">
              <span className="text-[11px] font-semibold tabular opacity-50">
                {i + 1}/{slides.length}
              </span>
              <div className="mt-auto text-[19px] font-bold leading-[1.05] tracking-tight">{s.headline}</div>
              <div className="mt-2 text-[11.5px] leading-snug opacity-75">{s.body}</div>
              <div className="mt-3 h-1 w-8 rounded-full" style={{ background: B.visual.accent }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Instagram story ---------- */

export function InstagramStory({ frames, keyVisualUrl, line }: { frames: { text: string; sticker: string | null }[]; keyVisualUrl: string | null; line: string }) {
  const f = frames[0];
  return (
    <PhoneFrame dark>
      <KeyVisual line={line} imageUrl={keyVisualUrl} className="absolute inset-0" aspect="portrait" safeArea />
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/50 to-transparent px-3 pb-6 pt-[46px]">
        <div className="flex gap-1">
          {frames.map((_, i) => (
            <span key={i} className={clsx("h-[2px] flex-1 rounded-full", i === 0 ? "bg-white" : "bg-white/35")} />
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[12px] text-white">
          <Avatar size={26} />
          <span className="font-semibold">cashy</span>
          <span className="opacity-60">2m</span>
        </div>
      </div>
      {f && (
        <div className="absolute inset-x-5 bottom-[22%] z-10 text-center">
          <div className="inline rounded-[6px] bg-white px-2 py-1 text-[15px] font-bold leading-[1.6] text-black [box-decoration-break:clone]">{f.text}</div>
          {f.sticker && (
            <div className="mx-auto mt-4 w-fit rounded-[12px] bg-white px-4 py-2 text-[12px] font-semibold text-black shadow-lg">{f.sticker}</div>
          )}
        </div>
      )}
      <div className="absolute inset-x-3 bottom-4 z-10 flex items-center gap-2">
        <div className="flex-1 rounded-full border border-white/50 px-4 py-2 text-[12px] text-white/80">Send message</div>
        <Heart className="h-5 w-5 text-white" />
        <Send className="h-5 w-5 text-white" />
      </div>
    </PhoneFrame>
  );
}

/* ---------- TikTok ---------- */

export function TikTokFrame({ hook, caption, keyVisualUrl, line }: { hook: string; caption: string; keyVisualUrl: string | null; line: string }) {
  return (
    <PhoneFrame dark>
      <KeyVisual line={line} imageUrl={keyVisualUrl} className="absolute inset-0" aspect="portrait" safeArea />
      <div className="absolute inset-x-0 top-[46px] z-10 flex justify-center gap-5 text-[14px] font-semibold text-white/70">
        <span>Following</span>
        <span className="text-white underline decoration-2 underline-offset-[6px]">For You</span>
      </div>
      <div className="absolute left-4 right-16 top-[30%] z-10">
        <span className="rounded-[6px] bg-black/75 px-2 py-1 text-[15px] font-bold leading-[1.65] text-white [box-decoration-break:clone]">{hook}</span>
      </div>
      <div className="absolute bottom-[86px] right-2.5 z-10 flex flex-col items-center gap-4 text-white">
        <div className="relative">
          <Avatar size={40} />
          <span className="absolute -bottom-2 left-1/2 grid h-4 w-4 -translate-x-1/2 place-items-center rounded-full bg-[#fe2c55]">
            <Plus className="h-3 w-3" />
          </span>
        </div>
        {[Heart, MessageCircle, Bookmark, Share].map((I, i) => (
          <div key={i} className="flex flex-col items-center">
            <I className="h-7 w-7 fill-white/90" strokeWidth={1.2} />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-3 pb-6 pt-10 text-white">
        <div className="text-[13px] font-semibold">@cashy</div>
        <p className="mt-1 line-clamp-2 pr-12 text-[12px] leading-snug">{caption}</p>
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px]">
          <Music2 className="h-3 w-3" /> original sound · Cashy
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ---------- Landing page ---------- */

export interface LandingCopy {
  eyebrow: string;
  headline: string;
  subhead: string;
  cta: string;
  sections: { title: string; body: string }[];
  faq: { q: string; a: string }[];
}

export function LandingPage({ copy, keyVisualUrl, mobile, line }: { copy: LandingCopy; keyVisualUrl: string | null; mobile?: boolean; line?: string }) {
  const v = B.visual;
  return (
    <div style={{ background: v.primary, color: v.ink }} className="[container-type:inline-size]">
      <nav className={clsx("flex items-center justify-between", mobile ? "px-5 py-4" : "px-[5cqw] py-[2.2cqw]")}>
        <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.18em]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.accent }} /> Cashy
        </span>
        <span className="rounded-full px-4 py-1.5 text-[12px] font-semibold" style={{ background: v.accent, color: v.primary }}>
          {copy.cta}
        </span>
      </nav>
      <header className={clsx("relative overflow-hidden", mobile ? "px-5 pb-10 pt-6" : "grid grid-cols-[1.1fr_1fr] items-center gap-[4cqw] px-[5cqw] pb-[6cqw] pt-[3cqw]")}>
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: v.accent }}>
            {copy.eyebrow}
          </div>
          <h1 className={clsx("mt-3 font-[750] leading-[0.98] tracking-[-0.035em]", mobile ? "text-[34px]" : "text-[clamp(32px,5.2cqw,72px)]")}>{copy.headline}</h1>
          <p className={clsx("mt-4 leading-relaxed opacity-75", mobile ? "text-[14px]" : "text-[clamp(14px,1.5cqw,19px)]")}>{copy.subhead}</p>
          <div className="mt-6 flex items-center gap-4">
            <span className="rounded-full px-6 py-3 text-[14px] font-semibold" style={{ background: v.accent, color: v.primary }}>
              {copy.cta}
            </span>
            <span className="text-[11px] opacity-60">18+ · T&Cs apply</span>
          </div>
        </div>
        {!mobile && <KeyVisual line={line ?? copy.headline} imageUrl={keyVisualUrl} className="aspect-[4/5] rounded-[2cqw]" aspect="portrait" />}
      </header>
      <section className={clsx("grid gap-px", mobile ? "grid-cols-1" : "grid-cols-3")} style={{ background: "rgba(255,255,255,0.08)" }}>
        {copy.sections.slice(0, 3).map((s, i) => (
          <div key={i} className={clsx(mobile ? "p-5" : "p-[3cqw]")} style={{ background: v.primary }}>
            <div className="mb-3 h-1 w-8 rounded-full" style={{ background: v.accent }} />
            <h3 className="text-[17px] font-bold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed opacity-70">{s.body}</p>
          </div>
        ))}
      </section>
      <section className={clsx(mobile ? "px-5 py-8" : "px-[5cqw] py-[4cqw]")} style={{ background: v.surface }}>
        <h2 className="text-[20px] font-bold tracking-tight">Questions</h2>
        <div className="mt-4 divide-y divide-white/10">
          {copy.faq.slice(0, 4).map((f, i) => (
            <div key={i} className="py-3">
              <div className="text-[14px] font-semibold">{f.q}</div>
              <div className="mt-1 text-[12.5px] leading-relaxed opacity-70">{f.a}</div>
            </div>
          ))}
        </div>
      </section>
      <footer className={clsx("text-[11px] leading-relaxed opacity-55", mobile ? "px-5 py-6" : "px-[5cqw] py-[2.5cqw]")}>
        18+ only. Gambling can be addictive. Play responsibly. Set deposit limits in your account settings. Terms apply.
      </footer>
    </div>
  );
}

export function BrowserFrame({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-float">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3.5 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="mx-auto max-w-[60%] truncate rounded-[7px] bg-surface-3 px-3 py-1 text-center text-[11.5px] text-ink-2">{url}</span>
      </div>
      <div className="max-h-[640px] overflow-y-auto">{children}</div>
    </div>
  );
}

/* ---------- Telegram & Discord ---------- */

export function TelegramPost({ text, keyVisualUrl, line }: { text: string; keyVisualUrl: string | null; line: string }) {
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[18px] bg-[#8fb1cc] p-4" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #a8c6dc 0, transparent 40%), radial-gradient(circle at 80% 70%, #7ea2c0 0, transparent 40%)" }}>
      <div className="max-w-[92%] overflow-hidden rounded-[14px] rounded-bl-[4px] bg-white text-black shadow-sm">
        <KeyVisual line={line} imageUrl={keyVisualUrl} className="aspect-[16/10] w-full" compact />
        <div className="px-3 py-2">
          <div className="text-[13px] font-semibold text-[#3a8ed0]">Cashy</div>
          <p className="mt-0.5 whitespace-pre-line text-[13.5px] leading-snug">{text}</p>
          <div className="mt-1 text-right text-[10.5px] text-black/40">9:41 · 👁 —</div>
        </div>
      </div>
    </div>
  );
}

export function DiscordMessage({ text }: { text: string }) {
  return (
    <div className="mx-auto w-full max-w-[560px] rounded-[12px] bg-[#313338] p-4 text-[#dbdee1] [font-family:'gg_sans',-apple-system,sans-serif]">
      <div className="mb-3 border-b border-white/5 pb-2 text-[13px] font-semibold text-[#949ba4]"># announcements</div>
      <div className="flex gap-3">
        <Avatar size={38} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[14px]">
            <span className="font-semibold text-white">Cashy</span>
            <span className="rounded-[3px] bg-[#5865f2] px-1 text-[10px] font-semibold text-white">BOT</span>
            <span className="text-[11px] text-[#949ba4]">Today at 9:41</span>
          </div>
          <p className="mt-0.5 whitespace-pre-line text-[14px] leading-[1.4]">{text}</p>
        </div>
      </div>
    </div>
  );
}
