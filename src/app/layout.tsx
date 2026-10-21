import type { Metadata, Viewport } from "next";
import { Fira_Code, Geist, Inter } from "next/font/google";
import { Shell } from "@/components/shell";
import { modelReady } from "@/lib/adapters/model";
import { imageReady } from "@/lib/adapters/image";
import { falReady } from "@/lib/adapters/image/fal";
import { repo } from "@/lib/store";
import { authMode } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Brian's own screen: a light geometric sans and a monospace for labels.
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], weight: ["300", "400", "500"] });
const mono = Fira_Code({ variable: "--font-fira", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Brian", template: "%s · Brian" },
  description: "Cashy's marketing brain. Discover what's rising, develop it into campaigns.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

import { capsFromEnv, spendFromRuns } from "@/lib/engine/spend";

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = await repo.read();
  const lastSweep = db.sweeps[0];
  const caps = capsFromEnv();
  const spent = spendFromRuns(Object.entries(db.spendLedger ?? {}).map(([day, costUsd]) => ({ startedAt: day, costUsd })), new Date(), caps.budgetSince);
  return (
    <html lang="en-GB" className={`${inter.variable} ${geist.variable} ${mono.variable} h-full`}>
      <body className="min-h-full">
        <Shell
          status={{
            auth: authMode() === "on",
            ai: modelReady(),
            images: imageReady() || falReady(),
            lastSweep: lastSweep?.finishedAt ?? null,
            liveSources: lastSweep?.sources.filter((s) => s.ok && s.signals > 0).length ?? 0,
            budget: caps.budgetUsd ?? null,
            budgetLeft: caps.budgetUsd !== undefined ? Math.max(0, caps.budgetUsd - (spent.spentSinceBudget ?? 0)) : null,
          }}
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
