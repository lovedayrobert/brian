import path from "node:path";

/** Where Brian keeps its data, media and inbox. A persistent volume in production (BRIAN_DATA_DIR). */
export function dataDir(): string {
  return process.env.BRIAN_DATA_DIR || path.join(process.cwd(), ".data");
}

export const mediaDir = () => path.join(dataDir(), "generated");
export const inboxDir = () => path.join(dataDir(), "inbox");
