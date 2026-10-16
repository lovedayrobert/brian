// Blind review hand-off between Brian installs.
//   npm run review -- export [reviewId] [file]     (owner)  -> brian-review-<id>.json.gz
//   npm run review -- import <file>                (reviewer)
//   npm run review -- results [reviewId] [file]    (reviewer) -> brian-review-results-<id>.json
//   npm run review -- import-ratings <file>        (owner)
import { exportResults, exportReview, importRatings, importReview } from "@/lib/review-transfer";
import { tally } from "@/lib/review";
import { repo } from "@/lib/store";

const [cmd, a, b] = process.argv.slice(2);
const latest = async () => (await repo.read()).reviews[0]?.id;

if (cmd === "export") {
  const id = a ?? (await latest());
  if (!id) throw new Error("No review to export. Run npm run eval first.");
  const r = await exportReview(id, b ?? `brian-review-${id}.json.gz`);
  console.log(`Wrote ${r.file} (${(r.bytes / 1e6).toFixed(1)} MB, ${r.media} images/videos). Send it to the reviewer.`);
} else if (cmd === "import") {
  if (!a) throw new Error("Usage: npm run review -- import <file>");
  const rv = await importReview(a);
  console.log(`Imported "${rv.title}". Start Brian (npm run dev) and open http://localhost:3000/review/${rv.id}`);
} else if (cmd === "results") {
  const id = a ?? (await latest());
  const out = b ?? `brian-review-results-${id}.json`;
  const res = await exportResults(id!, out);
  const rv = (await repo.read()).reviews.find((r) => r.id === id)!;
  const t = tally(rv);
  console.log(`Wrote ${out}: ${Object.keys(res.ratings).length} verdicts, ${t.wouldRun} of ${rv.ideaIds.length} you'd run (pass mark ${rv.passMark}). Send it back.`);
} else if (cmd === "import-ratings") {
  if (!a) throw new Error("Usage: npm run review -- import-ratings <file>");
  const r = await importRatings(a);
  console.log(`Imported ${r.added} verdicts (${r.skipped} already had). They're on the review page and in Memory.`);
} else {
  console.log("Usage: npm run review -- export|import|results|import-ratings ...");
}
