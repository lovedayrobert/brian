export interface AutopilotState {
  lastSweep?: string;
  /** The day (YYYY-MM-DD, UTC) the morning Pulse last ran */
  pulseDay?: string;
  /** The day the automatic idea check last ran */
  ideasDay?: string;
  /** What the last idea check decided, in plain words for Home */
  last?: { at: string; ran: boolean; note: string; cards?: number; ideaIds?: string[] };
}
