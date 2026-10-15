import type { BrandId, Citation } from "@/lib/domain/types";

/**
 * Brand books and advantage inventories (brief §4a, §4b).
 *
 * Visual identity values are PLACEHOLDERS until real brand assets are supplied
 * (logo files, fonts, colours). The UI marks them as such. Advantages come from
 * the brief; each needs a proof link before it can be used in player-facing copy.
 */
export interface BrandBook {
  id: BrandId;
  name: string;
  placeholderIdentity: boolean;
  positioning: string;
  voice: string[];
  toneExamples: { good: string; bad: string }[];
  bannedPhrases: string[];
  visual: {
    primary: string;
    accent: string;
    ink: string;
    surface: string;
    fontDisplay: string;
    fontBody: string;
    imagery: string[];
  };
  compliance: string[];
  advantages: Advantage[];
  baselineCostPerFtd: { value: number | null; provenance: "measured" | "missing" };
}

export interface Advantage {
  id: string;
  claim: string;
  proof: Citation | null; // null = proof link still needed
}

const BRIEF: Citation = {
  url: "internal:brian-build-brief",
  title: "Brian build brief, section 4b (Rob Loveday)",
  publisher: "Cashy internal",
  retrievedAt: "2026-10-15T00:00:00Z",
};

export const BRANDS: Record<BrandId, BrandBook> = {
  cashy: {
    id: "cashy",
    name: "Cashy",
    placeholderIdentity: true,
    positioning:
      "The crypto casino that pays out faster than anyone and has nothing to hide: no wagering, no win caps, every payment provable on-chain.",
    voice: [
      "Confident, quick and a little cheeky. Never corporate.",
      "Says the quiet part out loud about how other casinos treat players.",
      "Short sentences. Proof over adjectives.",
      "Internet-native: understands the joke before using it.",
    ],
    toneExamples: [
      { good: "Withdrew in 3 minutes. Took longer to write this tweet.", bad: "Experience our industry-leading withdrawal speeds!" },
      { good: "Zero wagering. Read that again.", bad: "Enjoy our generous bonus terms and conditions." },
    ],
    bannedPhrases: ["risk-free", "guaranteed win", "easy money", "can't lose", "get rich", "industry-leading", "best-in-class"],
    visual: {
      primary: "#0B0B0F",
      accent: "#2BD96B",
      ink: "#FFFFFF",
      surface: "#16161D",
      fontDisplay: "Inter",
      fontBody: "Inter",
      imagery: [
        "High contrast, dark grounds, a single hit of accent colour.",
        "Real interfaces and receipts over stock imagery.",
        "No real people's faces without a signed agreement.",
      ],
    },
    compliance: [
      "18+ on every player-facing asset.",
      "Responsible gambling line and link on landing pages and CRM.",
      "No content that appeals to minors (cartoon styles aimed at kids, school settings, under-25 looking talent).",
      "No implied endorsement by real people without an agreement.",
      "Never present gambling as a way to solve money problems.",
    ],
    advantages: [
      { id: "fast-withdrawals", claim: "Withdrawals in under 4 minutes", proof: BRIEF },
      { id: "zero-wagering", claim: "Zero wagering requirements", proof: BRIEF },
      { id: "no-win-cap", claim: "No win cap", proof: BRIEF },
      { id: "games", claim: "6,000+ games including provably fair originals", proof: BRIEF },
      { id: "onchain-proof", claim: "On-chain payment proof", proof: BRIEF },
      { id: "justice-fund", claim: "The Justice Fund and its claimant video library", proof: BRIEF },
      { id: "askgamblers", claim: "AskGamblers partnership", proof: BRIEF },
    ],
    baselineCostPerFtd: { value: null, provenance: "missing" },
  },
  bitstarz: {
    id: "bitstarz",
    name: "BitStarz",
    placeholderIdentity: true,
    positioning: "Brand book to be supplied (Phase 3).",
    voice: ["To be supplied."],
    toneExamples: [],
    bannedPhrases: ["risk-free", "guaranteed win", "easy money"],
    visual: {
      primary: "#0E1020",
      accent: "#F5B800",
      ink: "#FFFFFF",
      surface: "#181A2E",
      fontDisplay: "Inter",
      fontBody: "Inter",
      imagery: [],
    },
    compliance: ["18+ on every player-facing asset."],
    advantages: [],
    baselineCostPerFtd: { value: null, provenance: "missing" },
  },
};

/** Campaign history (brief §4c). Add every past campaign here as it is supplied. */
export const CAMPAIGN_HISTORY = [
  {
    brandId: "cashy" as BrandId,
    name: "Justice Fund",
    learnings: [
      "Coordinated amplification throttled reach.",
      "Conversion, not awareness, was the bottleneck.",
    ],
    source: BRIEF,
  },
];
