import { LoginForm } from "@/components/login-form";
import { allowedDomains, googleConfigured, passwordsEnabled } from "@/lib/auth";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  domain: "That Google account isn't on an allowed BitStarz domain.",
  cancelled: "Google sign-in was cancelled.",
  state: "The sign-in link expired. Try again.",
  google: "Google sign-in failed. Try again.",
  "not-configured": "Google sign-in isn't set up on this server yet.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  // Only allow same-site relative paths, never an open redirect.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <LoginForm next={safeNext} google={googleConfigured()} passwords={passwordsEnabled() || !googleConfigured()} domain={allowedDomains()[0]} initialError={error ? (ERRORS[error] ?? "Couldn't sign in.") : null} />;
}
