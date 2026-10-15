import * as z from "zod/v4";

/** Output schemas for each package section (brief chapter 5). UI types are inferred from these. */

const Claim = z.object({ text: z.string(), url: z.string().nullable() });
const Prov = z.enum(["measured", "benchmark", "assumption"]);

export const InsightSchema = z.object({
  whatsHappening: z.string(),
  drivers: z.array(Claim).describe("Who or what is driving it, cited"),
  culturalInsight: z.string().describe("Why people care, in one or two sentences"),
  competitors: z.array(z.object({ brand: z.string(), what: z.string(), date: z.string().nullable(), url: z.string().nullable() })),
  whyCashy: z.string(),
  moat: z.object({ howTheyWouldCopy: z.string(), whyItWouldNotWorkForThem: z.string() }),
});

export const StrategySchema = z.object({
  objective: z.string(),
  oneMetric: z.object({ metric: z.string(), target: z.string(), provenance: Prov }),
  kpis: z.array(z.object({ metric: z.string(), target: z.string(), killThreshold: z.string(), provenance: Prov })),
  audience: z.array(z.object({ segment: z.string(), whoTheyAre: z.string(), whereTheySpendTime: z.string(), evidence: z.array(Claim) })),
  positioning: z.string(),
  coreIdea: z.string(),
  messageHouse: z.object({
    key: z.string(),
    supporting: z.array(z.object({ message: z.string(), proofPoints: z.array(z.string()) })),
    tone: z.string(),
  }),
});

export const CreativeSchema = z.object({
  concept: z.string(),
  rationale: z.string(),
  keyVisual: z.object({
    description: z.string(),
    composition: z.string(),
    typeRules: z.string(),
    colourRules: z.string(),
    recurringElement: z.string(),
    heroLine: z.string().describe("The 2 to 6 word line set large on the key visual"),
  }),
  copy: z.object({
    x: z.object({ post: z.string(), thread: z.array(z.string()), replyBait: z.string() }),
    instagram: z.object({
      caption: z.string(),
      carousel: z.array(z.object({ headline: z.string(), body: z.string() })),
      story: z.array(z.object({ text: z.string(), sticker: z.string().nullable() })),
    }),
    tiktok: z.object({
      hook: z.string(),
      caption: z.string(),
      script: z.array(z.object({ time: z.string(), visual: z.string(), voiceover: z.string(), onScreenText: z.string() })),
    }),
    telegram: z.string(),
    discord: z.string(),
    landing: z.object({
      eyebrow: z.string(),
      headline: z.string(),
      subhead: z.string(),
      cta: z.string(),
      sections: z.array(z.object({ title: z.string(), body: z.string() })),
      faq: z.array(z.object({ q: z.string(), a: z.string() })),
    }),
    variants: z.array(z.object({ channel: z.string(), a: z.string(), b: z.string(), hypothesis: z.string() })),
  }),
  video: z.object({
    script: z.string(),
    storyboard: z.array(z.object({ frame: z.number(), shot: z.string(), visual: z.string(), audio: z.string() })),
  }),
  mechanic: z
    .object({
      userFlow: z.array(z.string()),
      rules: z.array(z.string()),
      rewardEconomics: z.string(),
      edgeCases: z.array(z.string()),
      draftTerms: z.array(z.string()),
    })
    .nullable(),
});

export const ChannelsSchema = z.object({
  channels: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["owned", "earned", "paid", "partner"]),
      role: z.string(),
      budgetWeight: z.number().describe("Relative weight for budget split; 0 for unpaid channels"),
      available: z.boolean().describe("False if a crypto casino cannot realistically buy or use this channel"),
      note: z.string(),
    }),
  ),
  creatorCriteria: z.array(z.string()),
  phasing: z.array(
    z.object({ phase: z.enum(["tease", "launch", "sustain"]), startDay: z.number(), endDay: z.number(), whatHappens: z.string() }),
  ),
  paidMediaNote: z.string(),
});

const Num = z.object({
  low: z.number(),
  expected: z.number(),
  high: z.number(),
  provenance: Prov,
  origin: z.string(),
  url: z.string().nullable(),
});

export const BusinessSchema = z.object({
  inputs: z.object({
    budget: Num.describe("Total campaign spend in USD, including creators, production and paid"),
    reach: Num.describe("Unique people reached across all channels"),
    engagementRate: Num.describe("Engagements per person reached, 0..1"),
    clickThroughRate: Num.describe("Site visits per person reached, 0..1"),
    signupRate: Num.describe("Sign-ups per visit, 0..1"),
    ftdRate: Num.describe("First-time depositors per sign-up, 0..1"),
  }),
  paidReachShare: z.number().describe("Share of reach that depends on paid spend, 0..1"),
  rationale: z.string(),
});

export const ProductionSchema = z.object({
  deliverables: z.array(
    z.object({
      name: z.string(),
      channel: z.string(),
      spec: z.string().describe("Exact dimensions, duration, format and copy length"),
      role: z.enum(["design", "content", "social", "crm", "product", "dev", "legal", "partnerships"]),
      dueDay: z.number().describe("Days relative to launch; negative = before launch"),
      dependsOn: z.array(z.string()),
    }),
  ),
  approvalGates: z.array(z.object({ name: z.string(), approver: z.string(), dueDay: z.number(), checks: z.array(z.string()) })),
  runbook: z.array(z.object({ time: z.string(), action: z.string(), owner: z.string(), ifItBreaks: z.string() })),
});

export const MeasurementSchema = z.object({
  tracking: z.array(z.object({ channel: z.string(), method: z.string(), example: z.string() })),
  dashboard: z.array(z.string()),
  thresholds: z.array(z.object({ checkpoint: z.string(), metric: z.string(), success: z.string(), kill: z.string() })),
  learnings: z.array(z.string()),
});

export const RiskSchema = z.object({
  responsibleGambling: z.array(z.string()),
  regulatory: z.array(z.object({ market: z.string(), point: z.string() })),
  platformPolicy: z.array(z.object({ platform: z.string(), risk: z.string(), mitigation: z.string() })),
  reputational: z.array(z.object({ risk: z.string(), likelihood: z.enum(["low", "medium", "high"]), response: z.string() })),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  moderation: z.array(z.string()),
});

export const ExecutiveSchema = z.object({
  title: z.string(),
  idea: z.string(),
  whyNow: z.string(),
  whyCashy: z.string(),
  whatItTakes: z.string(),
  expectedReturn: z.string(),
  mainRisk: z.string(),
  decision: z.string(),
});

export const HandoverSchema = z.object({
  projectName: z.string(),
  epics: z.array(
    z.object({
      name: z.string(),
      issues: z.array(
        z.object({
          title: z.string(),
          objective: z.string(),
          spec: z.string(),
          copy: z.string().nullable(),
          acceptance: z.array(z.string()),
          role: z.string(),
          dueDay: z.number(),
          dependsOn: z.array(z.string()),
        }),
      ),
    }),
  ),
});

/*
 * The API caps how large a structured-output schema can be, and the full
 * creative section is over it. It is generated in three parts with these
 * sub-schemas and merged back into CreativeSchema's shape.
 */
export const CreativeCoreSchema = CreativeSchema.pick({ concept: true, rationale: true, keyVisual: true, mechanic: true });
export const CreativeSocialSchema = z.object({
  x: CreativeSchema.shape.copy.shape.x,
  instagram: CreativeSchema.shape.copy.shape.instagram,
  tiktok: CreativeSchema.shape.copy.shape.tiktok,
  telegram: z.string(),
  discord: z.string(),
});
export const CreativeWebVideoSchema = z.object({
  landing: CreativeSchema.shape.copy.shape.landing,
  variants: CreativeSchema.shape.copy.shape.variants,
  video: CreativeSchema.shape.video,
});

export type Insight = z.infer<typeof InsightSchema>;
export type Strategy = z.infer<typeof StrategySchema>;
export type Creative = z.infer<typeof CreativeSchema>;
export type Channels = z.infer<typeof ChannelsSchema>;
export type Business = z.infer<typeof BusinessSchema>;
export type Production = z.infer<typeof ProductionSchema>;
export type Measurement = z.infer<typeof MeasurementSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type Executive = z.infer<typeof ExecutiveSchema>;
export type Handover = z.infer<typeof HandoverSchema>;
