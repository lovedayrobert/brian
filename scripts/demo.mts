// SAMPLE CONTENT. Loads a hand-written idea and package so Brian can be demoed
// before the AI key is connected. Everything is flagged `sample: true` and every
// screen shows a "Sample package" banner. Remove with `npm run demo -- --remove`.
import { computeAllScenarios, type FunnelKey } from "@/lib/engine/funnel";
import type { Idea, Input, Package, SectionKey } from "@/lib/domain/types";
import { repo } from "@/lib/store";

const remove = process.argv.includes("--remove");
const IDS = ["idea_demo_bounty", "idea_demo_wall", "idea_demo_pizza", "idea_demo_week"];
const PKG = "pkg_demo_bounty";

await repo.update((d) => {
  d.ideas = d.ideas.filter((i) => !IDS.includes(i.id));
  d.packages = d.packages.filter((p) => p.id !== PKG);
});
if (remove) {
  console.log("Sample removed");
  process.exit(0);
}

const now = new Date();
const iso = now.toISOString();
const launch = new Date(now.getTime() + 7 * 864e5).toISOString().slice(0, 10);
const BRIEF = { url: "internal:brian-build-brief", title: "Cashy advantage inventory", publisher: "Cashy internal", retrievedAt: iso };
const ASMON = "https://www.dexerto.com/kick/asmongold-says-he-rejected-offers-over-20-million-for-gambling-ads-as-hes-already-rich-3418802/";

const score = (value: number, reason: string) => ({ value, reason });
const passTests = (notes: string[]) =>
  ["One-sentence test", "Screenshot test", "Headline test", "Argument test", "Copy test"].map((name, i) => ({ name, pass: true, note: notes[i] }));

const bounty: Idea = {
  id: "idea_demo_bounty",
  brandId: "cashy",
  origin: "lab",
  lens: "rival-weak-spots",
  sample: true,
  name: "The Win Cap Bounty",
  oneLiner: "Hit a win cap at another casino? Show us the receipt and Cashy pays out what they kept.",
  headline: "Crypto casino offers to pay players the winnings rival sites capped",
  edge: "spicy",
  backlash:
    "Rivals will call it a stunt and point out it's capped too (it is, at $1,000 per player). Some players will try to fake screenshots, so verification has to be tight. Expect industry press to debate whether naming the practice is fair.",
  mechanism:
    "For two weeks, any player who hit a win cap at another casino in the last 90 days can submit proof. Cashy credits up to $1,000 of the capped amount as cash with zero wagering, withdrawable in minutes. Total pool: $20,000, first come, first served.\n\nWhy it's ours: Cashy has no win cap and no wagering requirements, so the offer is the product promise made literal. A rival with caps can't copy it without exposing its own terms.",
  borrowedAttention: "A rule players already resent at other casinos, and the screenshots of it they already post when it happens to them.",
  evidence: [
    { text: "Cashy has no win cap and zero wagering requirements.", citations: [BRIEF], status: "verified" },
    { text: "Win caps on bonus winnings are common at other casinos.", citations: [], status: "unresolved" },
  ],
  scores: {
    talkability: score(8, "Everyone who has been capped has a story, and the offer invites them to tell it."),
    simplicity: score(9, "One sentence, no explanation needed."),
    ownability: score(8, "Only works for a casino with no win cap; rivals copying it indict themselves."),
    cost: score(6, "The pool is the cost: $20k, fully capped."),
  },
  screening: {
    critic: {
      verdict: "pass",
      tests: passTests([
        "'Got capped? We'll pay what they kept.' Retellable as is.",
        "Players will post their cap screenshots alongside it; that is the point.",
        "'Crypto casino offers to pay players the winnings rival sites capped.'",
        "Genius, cheeky or unfair to rivals: people will take sides.",
        "Stake or Shuffle can't run it without drawing attention to caps of their own.",
      ]),
      reasons: ["Uses a real advantage as the weapon; the offer is the proof.", "Borderline on 'promotion with a new name', but the rival-baiting framing carries it."],
    },
    redLines: {
      pass: true,
      issues: [],
      consequences: [
        "Never name a rival in paid or owned copy; let players supply the context.",
        "Verification must not publish anyone's account data without consent.",
        "Legal to confirm the offer terms per market and that it isn't framed as recovering losses.",
      ],
    },
    priorArt: {
      found: false,
      summary: "Sample: a real run would search the web for casinos matching or refunding rivals' capped winnings and list any examples with links and dates.",
      examples: [],
    },
  },
  status: "developed",
  keyVisualPrompt: "A torn casino receipt with the word CAPPED stamped across it, mended with a bright green strip of tape. Dark background, high contrast, editorial.",
  createdAt: iso,
};

const wall: Idea = {
  ...bounty,
  id: "idea_demo_wall",
  lens: "advantages",
  name: "Proof of Pay",
  oneLiner: "A live public wall of every Cashy withdrawal: amount, chain receipt and how many seconds it took.",
  headline: "Crypto casino publishes every withdrawal in real time to prove payout speed",
  edge: "safe",
  backlash: "Some will say anyone can show fast small payouts; the answer is showing the big ones too.",
  mechanism: "A page and a Telegram feed that post every withdrawal live with its on-chain hash and time to complete.\n\nWhy it's ours: it turns 'withdrawals under 4 minutes' and on-chain payment proof from a claim into something anyone can check.",
  borrowedAttention: "On-chain transparency culture: crypto users already check wallets and hashes for fun.",
  scores: {
    talkability: score(6, "Satisfying to watch, but more trust-builder than talking point."),
    simplicity: score(9, "Instantly clear."),
    ownability: score(9, "Only works if your payouts really are that fast."),
    cost: score(8, "A page and a bot."),
  },
  screening: { ...bounty.screening, critic: { ...bounty.screening.critic, reasons: ["Strong proof, lower heat. Good always-on asset rather than a launch stunt."] } },
  status: "card",
};

const pizza: Idea = {
  ...bounty,
  id: "idea_demo_pizza",
  lens: "advantages",
  name: "Faster Than Your Pizza",
  oneLiner: "We race a Cashy withdrawal against a pizza delivery.",
  headline: "Casino says withdrawals beat pizza delivery",
  edge: "safe",
  backlash: "None. That's the problem.",
  status: "killed",
  screening: {
    critic: {
      verdict: "kill",
      bannedPatternHit: "Races or comparisons against everyday things",
      tests: passTests(["Fine", "No one screenshots this", "No press would write it", "No one argues", "Any casino could run it"]).map((t, i) => ({ ...t, pass: i === 0 })),
      reasons: ["On the banned list: a race against an everyday thing. Nobody reacts to it."],
    },
    priorArt: null,
    redLines: null,
  },
};

const week: Idea = {
  ...pizza,
  id: "idea_demo_week",
  name: "Zero Wagering Week",
  oneLiner: "A week of bonuses with no wagering.",
  headline: "Casino runs zero-wagering bonus week",
  screening: {
    ...pizza.screening,
    critic: { ...pizza.screening.critic, bannedPatternHit: "A standard promotion with a new name", reasons: ["A standard promotion with a new name. Our zero-wagering advantage deserves a stunt, not a calendar slot."] },
  },
};

// ---------------- Package ----------------
const inp = (key: FunnelKey, label: string, unit: Input["unit"], low: number, expected: number, high: number, origin: string): Input => ({
  key, label, unit, low, expected, high, provenance: "assumption", origin,
});
const inputs: Record<FunnelKey, Input> = {
  budget: inp("budget", "Total budget", "usd", 24000, 26000, 30000, "$20k bounty pool (only paid out if claimed) + $4k creators + $2k production; high case adds contingency"),
  reach: inp("reach", "People reached", "count", 250000, 800000, 2500000, "Mostly earned: player reposts, creator clips and press pickup. Wide range because earned reach is the least predictable input."),
  engagementRate: inp("engagementRate", "Engagement rate", "ratio", 0.01, 0.025, 0.045, "Rival-baiting and personal stories drive replies above a normal brand post"),
  clickThroughRate: inp("clickThroughRate", "Visit rate", "ratio", 0.004, 0.008, 0.015, "Clear reason to click: check if you qualify"),
  signupRate: inp("signupRate", "Sign-up rate", "ratio", 0.06, 0.1, 0.15, "Visitors arrive with a specific grievance and a specific payout to claim"),
  ftdRate: inp("ftdRate", "FTD rate", "ratio", 0.25, 0.35, 0.45, "Claimants are proven players already used to depositing"),
};

const [pes, exp, opt] = computeAllScenarios(inputs);
const sec = (key: SectionKey, content: unknown, model: string) => ({ key, status: "done" as const, content, model, updatedAt: iso });

const creative = {
  concept: "Turn the rule players hate most into a public receipt. Every capped win is a story; Cashy invites people to tell it, then settles it.",
  rationale: "Players don't believe casino claims, but they believe each other's screenshots. By asking for proof of rivals' caps, we let the internet make our point for us, and the payout proves we mean it.",
  keyVisual: {
    description: "A casino receipt with CAPPED stamped across it in red, mended with a strip of Cashy green tape. The tape is the recurring device: it 'fixes' what other casinos broke.",
    composition: "Receipt off-centre on a near-black ground, heavy negative space for the line. Close crop, slight angle, paper texture visible.",
    typeRules: "Headline in heavy grotesk, tight leading, sentence case. Amounts set in tabular figures like a real receipt.",
    colourRules: "Near-black ground, white type, Cashy green only on the tape and the CTA. Red only on the CAPPED stamp.",
    recurringElement: "The green tape strip, used as a divider, a sticker and a progress bar across every asset.",
    heroLine: "We pay what they capped.",
  },
  copy: {
    x: {
      post: "Got capped at another casino?\n\nShow us the receipt. We'll pay out what they kept, up to $1,000. Cash. Zero wagering. Withdraw in minutes.\n\n$20k pool. Two weeks. 18+",
      thread: [
        "How it works: screenshot of the cap + proof it's your account → our team checks it → the capped amount (up to $1k) lands as cash in your Cashy account.",
        "Why we can do this: Cashy has no win cap. None. And no wagering on anything.",
        "First come, first served until the $20k pool is gone. Terms below. 18+, play responsibly.",
      ],
      replyBait: "What's the most you ever got capped? Asking for a bounty.",
    },
    instagram: {
      caption: "Every capped win is a story. Bring us yours. We pay out what they kept, up to $1,000, zero wagering. $20k pool, two weeks only. 18+ · T&Cs in bio · Play responsibly",
      carousel: [
        { headline: "We pay what they capped.", body: "" },
        { headline: "You won. They capped it.", body: "Bonus caps, max-win rules, 'terms apply'. You know the feeling." },
        { headline: "Show us the receipt.", body: "Screenshot of the cap + proof it's your account." },
        { headline: "We pay out up to $1,000.", body: "Cash, zero wagering, withdrawable in minutes." },
        { headline: "Because we don't cap. Ever.", body: "$20k pool. Two weeks. 18+. Terms apply." },
      ],
      story: [
        { text: "Got capped somewhere else?", sticker: "Yes 😤 / Not yet" },
        { text: "Show us the receipt. We pay what they kept.", sticker: null },
        { text: "$20k pool. Two weeks. Link in bio. 18+", sticker: "Claim" },
      ],
    },
    tiktok: {
      hook: "POV: you hit the big win and the casino says 'max win reached'",
      caption: "We pay what they capped. Up to $1k, zero wagering. 18+ #casino #crypto",
      script: [
        { time: "0–3s", visual: "Phone screen: a win counter climbing, then freezing on a CAPPED pop-up", voiceover: "You won. Then they capped it.", onScreenText: "max win reached 🙃" },
        { time: "3–8s", visual: "Hand peels a strip of green tape and sticks it over the CAPPED stamp", voiceover: "Send us the receipt.", onScreenText: "show us the receipt" },
        { time: "8–14s", visual: "Cashy withdrawal confirming, timer showing under 4 minutes", voiceover: "We'll pay out what they kept, up to a thousand. No wagering.", onScreenText: "up to $1k · 0x wagering" },
        { time: "14–18s", visual: "End card: hero line and green tape", voiceover: "Cashy doesn't cap. Ever.", onScreenText: "We pay what they capped. 18+" },
      ],
    },
    telegram: "🧾 THE WIN CAP BOUNTY\n\nGot capped at another casino in the last 90 days? Send us the receipt. We pay out what they kept, up to $1,000, cash, zero wagering.\n\n$20k pool · 2 weeks · first come, first served\n18+ · Terms: cashy.com/bounty",
    discord: "**The Win Cap Bounty is live.** Hit a win cap anywhere else in the last 90 days? Open a ticket with your screenshot. We pay out the capped amount up to $1,000, cash, no wagering. $20k pool, two weeks. 18+, terms in #announcements.",
    landing: {
      eyebrow: "The Win Cap Bounty",
      headline: "We pay what they capped.",
      subhead: "Hit a win cap at another casino in the last 90 days? Show us the receipt and we'll pay out what they kept, up to $1,000, as cash with zero wagering.",
      cta: "Claim your bounty",
      sections: [
        { title: "1. Show us the receipt", body: "A screenshot of the cap message and proof the account is yours. Our team checks every claim by hand." },
        { title: "2. We pay what they kept", body: "Up to $1,000 of the capped amount lands in your Cashy account as cash. No wagering, no strings." },
        { title: "3. Withdraw in minutes", body: "Because there's no cap here either. Every withdrawal is on-chain and usually done in under 4 minutes." },
      ],
      faq: [
        { q: "Who can claim?", a: "Players aged 18+ in eligible markets who hit a win cap at another casino in the last 90 days. One claim per person." },
        { q: "What counts as proof?", a: "A screenshot of the cap message plus something showing the account is yours. We never publish your details." },
        { q: "How long does it run?", a: "Two weeks, or until the $20,000 pool is used up." },
        { q: "Is this a deposit bonus?", a: "No. It's cash with zero wagering. Full terms on this page." },
      ],
    },
    variants: [
      { channel: "X", a: "Got capped at another casino? Show us the receipt.", b: "They capped your win. We'll pay it.", hypothesis: "The question invites replies; the statement is more screenshot-able." },
      { channel: "Landing page CTA", a: "Claim your bounty", b: "Show us the receipt", hypothesis: "Action-led versus story-led; story-led may suit referred traffic." },
    ],
  },
  video: {
    script: "COLD OPEN. Phone screen. A win counter climbs.\nSFX: celebration.\nPOP-UP: 'Maximum win reached.' Silence.\n\nVO: You won. Then they capped it.\n\nA hand peels green tape and sticks it over the pop-up.\nVO: Send us the receipt. We'll pay what they kept.\n\nCUT TO: Cashy withdrawal completing. Timer: 3:41.\nVO: Up to a thousand. No wagering. Out in minutes.\n\nEND CARD: We pay what they capped. 18+. Play responsibly.",
    storyboard: [
      { frame: 1, shot: "Extreme close-up, phone", visual: "Win counter climbing fast, green numbers", audio: "Rising celebration SFX" },
      { frame: 2, shot: "Same, freeze", visual: "Red 'Maximum win reached' pop-up slams in", audio: "SFX cut to silence" },
      { frame: 3, shot: "Overhead, hands", visual: "Green tape peeled and stuck across the pop-up", audio: "Tape rip. VO: 'Send us the receipt.'" },
      { frame: 4, shot: "Phone, Cashy app", visual: "Withdrawal confirmation, timer 3:41", audio: "VO: 'Out in minutes.'" },
      { frame: 5, shot: "Graphic", visual: "Receipt with CAPPED stamp, mended by tape", audio: "Beat drop" },
      { frame: 6, shot: "End card", visual: "Hero line, 18+, URL", audio: "VO: 'We pay what they capped.'" },
    ],
  },
  mechanic: {
    userFlow: [
      "Player lands on cashy.com/bounty and signs up or logs in (18+, eligible market).",
      "Uploads a screenshot of the cap message and proof of account ownership.",
      "Support verifies within 24 hours; the image is never published.",
      "Approved claims get the capped amount up to $1,000 as zero-wagering cash.",
      "Live pool counter on the page shows what's left.",
    ],
    rules: [
      "One claim per person, household and payment method.",
      "Cap must have occurred within the 90 days before launch.",
      "Maximum $1,000 per claim; $20,000 total pool.",
      "Cashy may reject claims it can't verify.",
    ],
    rewardEconomics: "Worst case the full $20k is paid out. At the expected funnel (see the business case) that's well under the pool cap in claims, and each claimant is a proven depositor at another casino.",
    edgeCases: [
      "Edited screenshots: require account-ownership proof and check metadata.",
      "Caps from casinos operating illegally in the player's market: decline, and don't comment.",
      "Players showing signs of harm (self-excluded elsewhere): decline and signpost support.",
    ],
    draftTerms: [
      "Open to new and existing Cashy players aged 18+ in eligible jurisdictions.",
      "Claims must include evidence of a win cap applied by another operator between [date] and [date].",
      "The credit is cash with no wagering requirement and may be withdrawn at any time.",
      "The promotion ends at 23:59 UTC on [date] or when the $20,000 pool is exhausted.",
      "Cashy reserves the right to refuse claims it cannot verify. Self-excluded players are not eligible.",
    ],
  },
};

const pkg: Package = {
  id: PKG,
  ideaId: bounty.id,
  brandId: "cashy",
  status: "in_review",
  version: 1,
  sample: true,
  launchDate: launch,
  steering: [],
  createdAt: iso,
  updatedAt: iso,
  sections: {
    executive: sec("executive", {
      title: "The Win Cap Bounty: we pay what they capped",
      idea: "For two weeks, anyone capped at another casino shows us the receipt and we pay out what they kept, up to $1,000, cash with zero wagering.",
      whyNow: "Trust in casino marketing is low, even top creators publicly turn down gambling money, and players already share screenshots of caps when it happens.",
      whyCashy: "We have no win cap and no wagering. The offer is our promise made literal, and rivals can't copy it without exposing their own terms.",
      whatItTakes: "About $26k: a $20k pool paid only on verified claims, $4k creators, $2k production. One landing page, a claims queue for support, two weeks.",
      expectedReturn: `Expected case about ${exp.ftds} FTDs at about $${Math.round(exp.costPerFtd ?? 0)} each. Range: ${pes.ftds} FTDs in the pessimistic case to about ${opt.ftds.toLocaleString("en-GB")} in the optimistic one. All inputs are assumptions until our own data is connected.`,
      mainRisk: "Fake claims and rival pushback. Mitigated by manual verification and never naming a rival in our own copy.",
      decision: "Approve $26k and a launch in one week.",
    }, "Strategist"),
    insight: sec("insight", {
      whatsHappening: "Players are increasingly sceptical of casino promises, and the gap between a headline bonus and the small print (caps, wagering) is where trust breaks.",
      drivers: [
        { text: "Asmongold said he rejected over $20 million in gambling ad offers because he's 'already rich', a public sign of how wary big creators are of casino money.", url: ASMON },
        { text: "Players post screenshots of capped wins and wagering traps when they happen to them.", url: null },
      ],
      culturalInsight: "Nobody believes a casino's claim, but everybody believes another player's receipt.",
      competitors: [
        { brand: "Rival crypto casinos", what: "Commonly use bonus win caps and wagering requirements in promotions.", date: null, url: null },
      ],
      whyCashy: "No win cap, zero wagering and on-chain payment proof mean the stunt is simply us showing our terms in public.",
      moat: {
        howTheyWouldCopy: "A rival launches its own 'we pay your caps' offer.",
        whyItWouldNotWorkForThem: "Any rival with caps of its own invites players to point at them. The offer only works if your own terms are clean.",
      },
    }, "Strategist"),
    strategy: sec("strategy", {
      objective: "Make 'no win cap, no wagering' the thing crypto players associate with Cashy, and convert players who've been burned elsewhere.",
      oneMetric: { metric: "Verified bounty claims", target: "150+ in two weeks", provenance: "assumption" },
      kpis: [
        { metric: "Claims submitted", target: "400", killThreshold: "Under 50 by day 5", provenance: "assumption" },
        { metric: "Claim to FTD", target: "35%", killThreshold: "Under 15%", provenance: "assumption" },
        { metric: "Organic mentions of the bounty", target: "2,000", killThreshold: "Under 300 by day 4", provenance: "assumption" },
      ],
      audience: [
        { segment: "Burned bonus hunters", whoTheyAre: "Experienced crypto casino players who chase promotions and have hit caps or wagering traps.", whereTheySpendTime: "X, Telegram casino groups, Kick chat, review sites", evidence: [] },
        { segment: "Streamer viewers", whoTheyAre: "Kick and Twitch viewers who see big wins and caps live on stream.", whereTheySpendTime: "Kick, clip accounts on X and TikTok", evidence: [] },
      ],
      positioning: "The casino with nothing in the small print.",
      coreIdea: "We pay what they capped.",
      messageHouse: {
        key: "We pay what they capped.",
        supporting: [
          { message: "No win cap. Ever.", proofPoints: ["No max-win rules on any game", "The bounty itself"] },
          { message: "Zero wagering.", proofPoints: ["Bounty paid as cash", "Zero wagering across Cashy"] },
          { message: "Out in minutes.", proofPoints: ["Withdrawals usually under 4 minutes", "On-chain payment proof"] },
        ],
        tone: "Cheeky, confident, never bitter. We're settling a score for players, not attacking anyone.",
      },
    }, "Strategist"),
    creative: sec("creative", creative, "Creative Director"),
    mockups: sec("mockups", { keyVisualUrl: null, keyVisualModel: null }, "code"),
    channels: sec("channels", {
      channels: [
        { name: "X (organic)", type: "owned", role: "Launch post, thread and reply engagement with claimants' stories", budgetWeight: 0, available: true, note: "Lead channel" },
        { name: "Telegram and Discord", type: "owned", role: "Community launch and claim support", budgetWeight: 0, available: true, note: "" },
        { name: "Kick and X creators", type: "partner", role: "Three mid-size creators react to the bounty and share their own capped-win stories", budgetWeight: 3, available: true, note: "Selection criteria below" },
        { name: "Crypto-native placements", type: "paid", role: "Newsletter and Telegram channel sponsorships", budgetWeight: 1, available: true, note: "Check each placement's gambling policy" },
        { name: "iGaming and crypto press", type: "earned", role: "Pitch the headline to trade press", budgetWeight: 0, available: true, note: "" },
        { name: "Meta and Google ads", type: "paid", role: "—", budgetWeight: 0, available: false, note: "Not realistically available to an offshore crypto casino" },
      ],
      creatorCriteria: [
        "Gambling-friendly audience, 18+ verified",
        "Has publicly complained about caps or wagering before",
        "Clip-friendly delivery; strong reply engagement",
      ],
      phasing: [
        { phase: "tease", startDay: -2, endDay: 0, whatHappens: "Cryptic 'got capped?' posts and a receipt image with the green tape, no brand reveal." },
        { phase: "launch", startDay: 0, endDay: 3, whatHappens: "Bounty goes live across owned channels, creators post, press pitch goes out." },
        { phase: "sustain", startDay: 3, endDay: 14, whatHappens: "Share anonymised claim stories (with consent) and the live pool counter; final-48h push." },
      ],
      paidMediaNote: "Meta, Google and TikTok paid ads are treated as unavailable. Budget goes to creators and crypto-native placements, and the pool itself.",
    }, "Strategist"),
    business: sec("business", {
      inputs,
      paidReachShare: 0.2,
      rationale: "Most reach is earned. The pool is the largest cost but is only paid on verified claims, so the real spend scales with success. All inputs are assumptions until our own benchmarks are connected.",
      scenarios: computeAllScenarios(inputs),
      baselineCostPerFtd: null,
      vsBaseline: null,
    }, "Strategist"),
    production: sec("production", {
      deliverables: [
        { name: "Key visual (receipt + tape)", channel: "All", spec: "Master 3000×3000 PSD; crops 1600×900, 1080×1080, 1080×1920", role: "design", dueDay: -5, dependsOn: [] },
        { name: "Landing page /bounty", channel: "Web", spec: "Responsive; claim form, live pool counter, FAQ, terms", role: "dev", dueDay: -3, dependsOn: ["Key visual (receipt + tape)"] },
        { name: "Claim verification flow", channel: "Product", spec: "Support queue, checklist, 24h SLA, decline templates", role: "product", dueDay: -3, dependsOn: [] },
        { name: "TikTok / Reels video", channel: "TikTok, Instagram", spec: "1080×1920, 18s, captions burned in", role: "content", dueDay: -2, dependsOn: ["Key visual (receipt + tape)"] },
        { name: "X launch post and thread", channel: "X", spec: "1600×900 image, post ≤ 280 chars, 3-post thread", role: "social", dueDay: -1, dependsOn: ["Key visual (receipt + tape)"] },
        { name: "Creator briefs", channel: "Partners", spec: "One-page brief per creator with dos and don'ts", role: "partnerships", dueDay: -4, dependsOn: [] },
        { name: "Terms and conditions", channel: "Web", spec: "Final terms per market", role: "legal", dueDay: -3, dependsOn: [] },
      ],
      approvalGates: [
        { name: "Brand review", approver: "Head of Marketing", dueDay: -4, checks: ["Voice", "No rival named", "18+ and RG line present"] },
        { name: "Compliance and legal", approver: "Legal", dueDay: -3, checks: ["Terms per market", "Not framed as recovering losses", "Privacy of claim evidence"] },
        { name: "Final sign-off", approver: "Marko", dueDay: -1, checks: ["Budget", "Launch timing"] },
      ],
      runbook: [
        { time: "09:00", action: "Landing page and claim form live; pool counter at $20,000", owner: "Dev", ifItBreaks: "Hold all posts until the page is back" },
        { time: "09:15", action: "X post and thread; pin it", owner: "Social", ifItBreaks: "Repost from backup account copy" },
        { time: "09:30", action: "Telegram and Discord announcements", owner: "Community", ifItBreaks: "Moderators post from the template" },
        { time: "10:00", action: "Creators post; press pitch sent", owner: "Partnerships", ifItBreaks: "Stagger creators across the day" },
        { time: "All day", action: "Support clears claims within SLA; social replies to stories", owner: "Support, Social", ifItBreaks: "Pause new claims if the queue passes 24h" },
      ],
    }, "Producer"),
    measurement: sec("measurement", {
      tracking: [
        { channel: "X", method: "UTM on every link", example: "cashy.com/bounty?utm_source=x&utm_medium=organic&utm_campaign=wincap_bounty" },
        { channel: "Creators", method: "Unique link and code per creator", example: "cashy.com/bounty?ref=creator_a · code CAPPED-A" },
        { channel: "Telegram", method: "UTM per channel", example: "cashy.com/bounty?utm_source=telegram&utm_campaign=wincap_bounty" },
      ],
      dashboard: ["Claims submitted, approved, declined", "Pool remaining", "Sign-ups and FTDs by source", "Organic mentions", "Cost per FTD"],
      thresholds: [
        { checkpoint: "Day 2", metric: "Claims submitted", success: "100+", kill: "Under 20" },
        { checkpoint: "Day 5", metric: "Claim to FTD", success: "30%+", kill: "Under 15%" },
        { checkpoint: "Day 14", metric: "Cost per FTD", success: "Under $150", kill: "Over $400" },
      ],
      learnings: [
        "How many players have been capped elsewhere, and where",
        "Whether rival-baiting outperforms straight proof for Cashy",
        "Which creators drive claimants, not just views",
      ],
    }, "Producer"),
    risk: sec("risk", {
      responsibleGambling: [
        "18+ and the responsible gambling line on every asset and the landing page",
        "Self-excluded players are not eligible; claims showing signs of harm are declined and signposted to support",
        "Framed around wins that were capped, never as recovering losses",
      ],
      regulatory: [
        { market: "All", point: "Legal to confirm the offer and terms in each market where we operate" },
        { market: "All", point: "Comparative claims: avoid naming or implying a specific rival" },
      ],
      platformPolicy: [
        { platform: "X", risk: "Organic gambling content is restricted in some markets", mitigation: "Organic only, age-gated account, no paid boost" },
        { platform: "TikTok and Instagram", risk: "Gambling promotion restricted", mitigation: "Treat as reach bonus only; the campaign doesn't depend on them" },
      ],
      reputational: [
        { risk: "Rivals call it a cheap stunt", likelihood: "high", response: "Agree it's a stunt. Point to the terms: no cap, no wagering." },
        { risk: "Fake claims go viral", likelihood: "medium", response: "Show the verification process; it's why claims take up to 24h." },
        { risk: "Pool runs out on day one", likelihood: "low", response: "Celebrate it publicly and close; consider a second round." },
      ],
      faq: [
        { q: "Is this real?", a: "Yes, $20,000 pool, paid as cash with no wagering." },
        { q: "Why are you doing this?", a: "Because we don't cap wins, and we think nobody should." },
      ],
      moderation: ["Never confirm which casino capped someone", "Remove posts that share other players' account details", "Move claim questions to support tickets"],
    }, "Red Lines"),
    handover: sec("handover", {
      projectName: "Cashy | Win Cap Bounty",
      epics: [
        {
          name: "Design",
          issues: [
            { title: "Cashy | Social | Static | Win Cap Bounty key visual", objective: "Master key visual and crops", spec: "3000×3000 master; 1600×900, 1080×1080, 1080×1920", copy: "We pay what they capped.", acceptance: ["Brand review passed", "All crops exported", "18+ visible"], role: "design", dueDay: -5, dependsOn: [] },
            { title: "Cashy | Social | Carousel | Win Cap Bounty explainer", objective: "Five-slide Instagram carousel", spec: "5 × 1080×1080", copy: null, acceptance: ["Matches copy deck", "Tape device on every slide"], role: "design", dueDay: -3, dependsOn: ["Cashy | Social | Static | Win Cap Bounty key visual"] },
          ],
        },
        {
          name: "Content",
          issues: [
            { title: "Cashy | Win Cap Bounty | X Launch post", objective: "Launch post and thread", spec: "Post ≤ 280 chars + 3-post thread", copy: creative.copy.x.post, acceptance: ["Approved copy", "UTM links"], role: "social", dueDay: -1, dependsOn: [] },
            { title: "Cashy | Win Cap Bounty | TikTok Video", objective: "18s vertical video", spec: "1080×1920, captions burned in", copy: null, acceptance: ["Storyboard followed", "18+ end card"], role: "content", dueDay: -2, dependsOn: [] },
          ],
        },
        {
          name: "Product and dev",
          issues: [
            { title: "Cashy | Win Cap Bounty | Web Landing page", objective: "Landing page with claim form and live pool counter", spec: "Responsive, claim upload, FAQ, terms", copy: null, acceptance: ["Counter updates live", "Form stores evidence privately"], role: "dev", dueDay: -3, dependsOn: [] },
          ],
        },
        {
          name: "Legal",
          issues: [
            { title: "Cashy | Win Cap Bounty | Legal Terms", objective: "Final terms per market", spec: "Based on draft terms in the package", copy: null, acceptance: ["Signed off by legal"], role: "legal", dueDay: -3, dependsOn: [] },
          ],
        },
      ],
    }, "Producer"),
  },
};

await repo.update((d) => {
  d.ideas.unshift(bounty, wall, pizza, week);
  d.packages.unshift(pkg);
});
console.log("Sample loaded: /develop/" + PKG);
