import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Only same-site paths: blocks open redirects like ?next=//evil.example */
function safeNext(v: string | undefined): string {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/account";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const next = safeNext(one(sp.next));
  const user = await getUser().catch(() => null);
  if (user) redirect(user.role === "admin" ? "/admin" : next.startsWith("/admin") ? "/account" : next);

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Sign in with your number</h1>
      <p className="mb-8 mt-3 text-slate">Just your mobile number and a text-message code. You can also book without signing in.</p>
      <AuthPanel next={next} />
    </div>
  );
}
