"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { normalizePhone, prettyPhone } from "@/lib/phone";
import { btn, field, label } from "./ui";

type Post = { role?: string; error?: string; demoCode?: string };

/** Phone + one-time code sign-in (no email, no password). The admin login sits underneath. */
export function AuthPanel({ next }: { next: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState({ email: "", password: "" });
  const codeRef = useRef<HTMLInputElement>(null);
  const normalized = normalizePhone(phone);

  function finish(role: string) {
    const dest = role === "admin" ? (next.startsWith("/admin") ? next : "/admin") : next.startsWith("/admin") ? "/account" : next;
    router.push(dest);
    router.refresh();
  }

  async function post(url: string, body: unknown, key: string): Promise<Post | null> {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as Post;
      if (res.ok) return data;
      setError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setBusy(null);
    return null;
  }

  async function sendCode() {
    if (!normalized) {
      setError("Enter a Bangladesh mobile number, like 01712 345 678.");
      return;
    }
    const data = await post("/api/auth/otp/request", { phone: normalized }, "send");
    if (!data) return;
    setBusy(null);
    setSent(true);
    setCode(data.demoCode ?? "");
    setDemoCode(data.demoCode ?? null);
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(value: string) {
    if (!normalized || value.length !== 6) return;
    const data = await post("/api/auth/otp/verify", { phone: normalized, code: value }, "verify");
    if (data) finish(data.role ?? "client");
  }

  return (
    <div className="grid gap-8">
      <section aria-label="Sign in with your phone">
        {!sent ? (
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            <div>
              <label htmlFor="a-phone" className={label}>
                Mobile number
              </label>
              <input
                id="a-phone"
                className={`${field} text-lg`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="01712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
              <p className="mt-1.5 text-sm text-slate">We&apos;ll text you a 6-digit code. No password, no email. New here? Your account is created automatically. We use your number only for sign-in and your bookings, and never share it.</p>
            </div>
            {error && (
              <p role="alert" className="font-semibold text-bad">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy !== null || !normalized} className={btn.primary}>
              {busy === "send" ? "Sending..." : "Text me a code"}
            </button>
          </form>
        ) : (
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void verify(code);
            }}
          >
            <div>
              <label htmlFor="a-code" className={label}>
                Enter the code we sent to {normalized ? prettyPhone(normalized) : phone}
              </label>
              <input
                id="a-code"
                ref={codeRef}
                className={`${field} text-center font-display text-3xl font-bold tracking-[0.4em]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  if (v.length === 6) void verify(v); // sign in as soon as the sixth digit is typed
                }}
                placeholder="------"
              />
              {demoCode && (
                <p className="mt-2 rounded-control border-2 border-dashed border-ink-3 bg-white p-3 text-sm text-slate">
                  <strong className="text-ink">Demo mode:</strong> no real text message is sent. Your code is <strong className="text-ink">{demoCode}</strong> and is already filled in.
                </p>
              )}
            </div>
            {error && (
              <p role="alert" className="font-semibold text-bad">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy !== null || code.length !== 6} className={btn.primary}>
              {busy === "verify" ? "Signing in..." : "Sign in"}
            </button>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
              <button type="button" className="font-semibold text-pole-dark underline underline-offset-4" disabled={busy !== null} onClick={() => void sendCode()}>
                Send a new code
              </button>
              <button
                type="button"
                className="font-semibold text-slate underline underline-offset-4"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setError(null);
                }}
              >
                Change number
              </button>
            </div>
          </form>
        )}
      </section>

      <details className="rounded-panel border-2 border-line bg-white p-4">
        <summary className="cursor-pointer font-semibold">Admin login</summary>
        <form
          className="mt-4 grid gap-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const d = await post("/api/auth/login", staff, "staff");
            if (d) finish(d.role ?? "client");
          }}
        >
          <div>
            <label htmlFor="s-email" className={label}>
              Username
            </label>
            <input id="s-email" className={field} type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" placeholder={process.env.NEXT_PUBLIC_ADMIN_HINT_USER} value={staff.email} onChange={(e) => setStaff((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="s-pass" className={label}>
              Password
            </label>
            <input id="s-pass" className={field} type="password" autoComplete="current-password" placeholder={process.env.NEXT_PUBLIC_ADMIN_HINT_PASS} value={staff.password} onChange={(e) => setStaff((s) => ({ ...s, password: e.target.value }))} />
          </div>
          <button type="submit" disabled={busy !== null} className={btn.dark}>
            {busy === "staff" ? "One moment..." : "Sign in"}
          </button>
        </form>
      </details>
    </div>
  );
}
