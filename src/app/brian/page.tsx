import { BrainApp, type BrainView } from "@/components/brain/brain-app";
import { modelReady } from "@/lib/adapters/model";
import { examplesView, lookbackView, nodesView, questionsView } from "@/lib/brain-view";
import { load } from "@/lib/queries";

export const metadata = { title: "Brian" };

/** The main Brian: teach him, see his brain, answer his questions; campaigns each have their own Brian. */
export default async function MainBrianPage({ searchParams }: { searchParams: Promise<{ brain?: string }> }) {
  const { brain } = await searchParams;
  const db = await load();
  const view: BrainView = {
    ai: modelReady(),
    lookback: lookbackView(db),
    preview: brain !== undefined && !Number.isNaN(Number(brain)) ? Math.max(0, Math.min(1, Number(brain))) : undefined,
    nodes: nodesView(db, {}),
    questions: questionsView(db, {}),
    examples: examplesView(db, {}),
  };
  return <BrainApp view={view} />;
}
