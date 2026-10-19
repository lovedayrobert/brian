import type { DayKind } from "./days";

/** How each kind of special day looks. Shared by server and browser code. */
export const DAY_KIND: Record<DayKind, { name: string; icon: string; cls: string }> = {
  holiday: { name: "Holidays", icon: "🎉", cls: "bg-[#fde7ec] text-[#a3244a]" },
  crypto: { name: "Crypto days", icon: "₿", cls: "bg-[#fff1d6] text-[#94600a]" },
  internet: { name: "Internet days", icon: "✦", cls: "bg-[#e9e7fd] text-[#4b3fb5]" },
  gaming: { name: "Gaming", icon: "🎮", cls: "bg-[#e1f3ff] text-[#1767a6]" },
  sport: { name: "Sport & betting", icon: "🏈", cls: "bg-[#e3f6e9] text-[#1f7a3f]" },
  shopping: { name: "Shopping days", icon: "🛍", cls: "bg-[#f3e8fd] text-[#7a2fb0]" },
  cashy: { name: "Cashy dates", icon: "★", cls: "bg-accent-soft text-accent-ink" },
};
