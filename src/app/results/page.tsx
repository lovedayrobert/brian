import { BarChart3 } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Results" };

export default function Results() {
  return (
    <>
      <PageHeader title="Results" subtitle="Forecast versus actual for every shipped campaign, and how accurate Brian's models are over time." />
      <EmptyState
        icon={<BarChart3 className="h-5 w-5" />}
        title="No shipped campaigns yet"
        body="When a campaign goes live, its tracking links and analytics feed results back here, and every forecast is scored against what actually happened (Phase 4)."
      />
    </>
  );
}
