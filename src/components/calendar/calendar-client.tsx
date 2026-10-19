"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/** The calendar is a browser-only app: it reads saved filters and display settings before first paint. */
export const CalendarClient = dynamic(() => import("./calendar-app").then((m) => m.CalendarApp), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center text-ink-3">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  ),
});
