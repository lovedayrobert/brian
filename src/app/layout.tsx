import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Shell } from "@/components/shell";
import { modelReady } from "@/lib/adapters/model";
import { imageReady } from "@/lib/adapters/image";
import { repo } from "@/lib/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

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

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = await repo.read();
  const lastSweep = db.sweeps[0];
  return (
    <html lang="en-GB" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <Shell
          status={{
            ai: modelReady(),
            images: imageReady(),
            lastSweep: lastSweep?.finishedAt ?? null,
            liveSources: lastSweep?.sources.filter((s) => s.ok && s.signals > 0).length ?? 0,
          }}
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
