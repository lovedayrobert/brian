import { describe, expect, it } from "vitest";
import { authMode, checkPassword, cookieValue, createSession, parseUsers, safeEqual, verifySession } from "./auth";

const SECRET = "x".repeat(40);

describe("authMode", () => {
  it("is on when users and a long secret are set", () => {
    expect(authMode({ BRIAN_USERS: "rob:pw", BRIAN_SESSION_SECRET: SECRET })).toBe("on");
  });
  it("locks production when login isn't configured", () => {
    expect(authMode({ NODE_ENV: "production" })).toBe("misconfigured");
    expect(authMode({ NODE_ENV: "production", BRIAN_USERS: "rob:pw", BRIAN_SESSION_SECRET: "short" })).toBe("misconfigured");
  });
  it("allows local development without login", () => {
    expect(authMode({ NODE_ENV: "development" })).toBe("off-dev");
  });
});

describe("passwords", () => {
  const users = parseUsers("Rob:correct horse, marko:battery staple ,broken,:nope");
  it("parses users case-insensitively and skips malformed entries", () => {
    expect([...users.keys()]).toEqual(["rob", "marko"]);
  });
  it("accepts the right password only", () => {
    expect(checkPassword(users, "ROB", "correct horse")).toBe(true);
    expect(checkPassword(users, "rob", "correct hors")).toBe(false);
    expect(checkPassword(users, "nobody", "correct horse")).toBe(false);
  });
  it("compares in constant time shape", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("sessions", () => {
  it("round-trips a valid session", async () => {
    const t = await createSession("rob", SECRET);
    expect((await verifySession(t, SECRET))?.user).toBe("rob");
  });
  it("rejects tampering, the wrong secret and expiry", async () => {
    const t = await createSession("rob", SECRET);
    const [payload, sig] = t.split(".");
    const forged = btoa(JSON.stringify({ user: "admin", exp: Date.now() + 1e9 })).replace(/=+$/, "");
    expect(await verifySession(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(await verifySession(`${payload}.${sig}x`, SECRET)).toBeNull();
    expect(await verifySession(t, "y".repeat(40))).toBeNull();
    const old = await createSession("rob", SECRET, Date.now() - 8 * 86_400_000);
    expect(await verifySession(old, SECRET)).toBeNull();
    expect(await verifySession(undefined, SECRET)).toBeNull();
    expect(await verifySession("garbage", SECRET)).toBeNull();
  });
  it("reads the cookie header", () => {
    expect(cookieValue("a=1; brian_session=abc.def; b=2", "brian_session")).toBe("abc.def");
    expect(cookieValue(null, "brian_session")).toBeUndefined();
  });
});
