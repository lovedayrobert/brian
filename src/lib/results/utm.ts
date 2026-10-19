import type { Platform } from "./platforms";

/**
 * Tracking links. Every task gets a campaign name, and every channel gets its
 * own link, so GA4 can say which idea and which post brought people in.
 * utm_campaign = the task's campaign slug; utm_source = the channel;
 * utm_medium = social / crm / creator; utm_content = the task.
 */
export function campaignSlug(title: string, taskId: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 40)
    .replace(/-$/, "");
  const short = taskId.replace(/^(lin_|loc_|crm_)/, "").replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
  return `${base || "task"}-${short}`;
}

export const UTM_CHANNELS: { source: string; medium: string; label: string; platform: Platform | "Email" | "Push" | "Creator" }[] = [
  { source: "x", medium: "social", label: "X", platform: "X" },
  { source: "instagram", medium: "social", label: "Instagram", platform: "Instagram" },
  { source: "tiktok", medium: "social", label: "TikTok", platform: "TikTok" },
  { source: "telegram", medium: "social", label: "Telegram", platform: "Telegram" },
  { source: "discord", medium: "social", label: "Discord", platform: "Discord" },
  { source: "youtube", medium: "social", label: "YouTube", platform: "YouTube" },
  { source: "newsletter", medium: "crm", label: "Newsletter", platform: "Email" },
  { source: "push", medium: "crm", label: "Push", platform: "Push" },
  { source: "creator", medium: "creator", label: "Creator / streamer", platform: "Creator" },
];

export function trackingLink(destination: string, slug: string, ch: { source: string; medium: string }, taskId: string): string {
  const u = new URL(destination);
  u.searchParams.set("utm_source", ch.source);
  u.searchParams.set("utm_medium", ch.medium);
  u.searchParams.set("utm_campaign", slug);
  u.searchParams.set("utm_content", taskId.replace(/^(lin_|loc_|crm_)/, "").slice(-8));
  return u.toString();
}

export const DEFAULT_DESTINATION = process.env.NEXT_PUBLIC_BRIAN_DEFAULT_LINK || "https://cashy.com";
