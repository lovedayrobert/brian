/** Shared by server and browser. */
export const REACTIONS = ["🔥", "👍", "👎", "😂"] as const;
export type Reaction = (typeof REACTIONS)[number];

export interface Comment {
  id: string;
  target: { type: "idea" | "swipe" | "task"; id: string };
  by: string;
  at: string;
  text: string;
  mentions: string[];
  /** Set when the comment was also posted to Linear */
  linearId?: string;
}
