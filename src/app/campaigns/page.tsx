import { Rocket } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Campaigns" };

export default function Campaigns() {
  return (
    <>
      <PageHeader title="Campaigns" subtitle="Approved and live campaigns with status, Linear progress and live results." />
      <EmptyState
        icon={<Rocket className="h-5 w-5" />}
        title="Nothing live yet"
        body="Packages move here when they're approved. Live results and Linear progress connect in Phase 4, once analytics and the Linear key are in place."
      />
    </>
  );
}
