/**
 * How Brian must not write. AI models have habits that make copy read as
 * machine-made ("ship it", "it's not X, it's Y", "diabolical", em dashes for
 * drama). Rob's rule: write the way a marketer briefs a colleague. These are
 * banned in the prompts and checked in code after every run.
 */
export const AI_TELLS: { re: RegExp; label: string }[] = [
  { re: /\bship(s|ped)?\b/i, label: "\"ship\"" }, // "shipping costs" is fine; "ship it", "shipped to xQc" are not
  { re: /\b(it|this|that)['’]?s not (just |only |about )?[^.!?\n]{1,60}[,;—–-]+\s*(it|this|that)['’]?s\b/i, label: "\"it's not X, it's Y\"" },
  { re: /\bnot (just|only) [^.!?\n]{1,50}[,;—–-]+\s*but\b/i, label: "\"not just X, but Y\"" },
  { re: /\bdiabolical\b/i, label: "\"diabolical\"" },
  { re: /\bunhinged\b/i, label: "\"unhinged\"" },
  { re: /\bchef['’]?s kiss\b/i, label: "\"chef's kiss\"" },
  { re: /\bhere['’]?s the (thing|kicker|twist)\b/i, label: "\"here's the thing\"" },
  { re: /\bthe internet (will|would|is going to) (lose|go|melt)/i, label: "\"the internet will lose it\"" },
  { re: /—/, label: "em dash" },
  { re: /\b(game[- ]changer|masterclass|iconic|legendary|elevate[sd]?|leverag(e|es|ing))\b/i, label: "marketing filler" },
  { re: /\b(no cap|fr fr|bussin|it'?s giving|slay(s|ed)?|ate and left no crumbs)\b/i, label: "forced slang" },
  { re: /\b(in a world where|buckle up|let that sink in|plot twist)\b/i, label: "cliché" },
];

export function aiTells(...texts: (string | undefined | null)[]): string[] {
  const t = texts.filter(Boolean).join("\n");
  return [...new Set(AI_TELLS.filter((x) => x.re.test(t)).map((x) => x.label))];
}

export const STYLE_RULES = `<writing>
Write the way a sharp marketer briefs a colleague: plain words, short sentences, specific details. Never use: ${AI_TELLS.map((t) => t.label).join(", ")}. No "it's not X, it's Y" or "not just X, but Y" constructions. No dramatic em dashes. Don't sell the idea in its own description.
</writing>`;
