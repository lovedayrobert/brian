import { repo, type DB } from "@/lib/store";

/**
 * The team. Everyone who signs in becomes a person (from Google: name, email
 * and photo). Admins (BRIAN_ADMINS: emails or login names, comma separated)
 * can edit Memory and settings; everyone else can do everything else.
 */
export interface Person {
  id: string; // the session user: an email for Google sign-in, a name for passwords
  name: string;
  email?: string;
  avatarUrl?: string;
  firstSeen: string;
  lastSeen: string;
}

export function admins(): string[] {
  return (process.env.BRIAN_ADMINS || "rob,marko,rob.loveday@bitstarz.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function isAdmin(user: string | null | undefined): boolean {
  if (!user) return false;
  if (user === "local") return true; // local development without login
  return admins().includes(user.toLowerCase());
}

/** "rob.loveday@bitstarz.com" → "Rob Loveday"; "rob" → "Rob". */
export function nameFromId(id: string): string {
  const base = id.split("@")[0];
  return base
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export function personName(db: Pick<DB, "people">, id: string | undefined): string {
  if (!id) return "Brian";
  if (id === "local") return "You";
  return db.people?.find((p) => p.id === id)?.name ?? nameFromId(id);
}

export function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const lastTouch = new Map<string, number>();

/** Record a sign-in or a visit. Cheap: writes at most every ten minutes per person. */
export async function touchPerson(id: string, profile?: { name?: string; email?: string; avatarUrl?: string }) {
  if (id === "local") return;
  const now = Date.now();
  if (!profile && now - (lastTouch.get(id) ?? 0) < 10 * 60_000) return;
  lastTouch.set(id, now);
  const at = new Date(now).toISOString();
  await repo.update((d) => {
    d.people ??= [];
    const p = d.people.find((x) => x.id === id);
    if (p) {
      p.lastSeen = at;
      if (profile?.name) p.name = profile.name;
      if (profile?.avatarUrl) p.avatarUrl = profile.avatarUrl;
      if (profile?.email) p.email = profile.email;
    } else {
      d.people.push({ id, name: profile?.name || nameFromId(id), email: profile?.email ?? (id.includes("@") ? id : undefined), avatarUrl: profile?.avatarUrl, firstSeen: at, lastSeen: at });
    }
  });
}
