"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn, field, label } from "./ui";

type Mode = "signin" | "register";

export function AuthPanel({ next, initialMode }: { next: string; initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function finish(role: string) {
    const dest = role === "admin" ? (next.startsWith("/admin") ? next : "/admin") : next.startsWith("/admin") ? "/account" : next;
    router.push(dest);
    router.refresh();
  }

  async function post(url: string, body: unknown, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { role?: string; error?: string };
      if (res.ok) {
        finish(data.role ?? "client");
        return;
      }
      setError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setBusy(null);
  }

  return (
    <div className="grid gap-8">
      {/* Demo accounts: clearly labelled, one click, no password */}
      <section aria-labelledby="demo-h" className="rounded-panel border-2 border-dashed border-ink-3 bg-white p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-chip bg-ink px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Demo accounts</span>
        </div>
        <h2 id="demo-h" className="mt-3 text-xl">
          Just looking around?
        </h2>
        <p className="mt-1 text-[15px] text-slate">
          Try the site with a shared demo account. No password needed. These accounts hold sample data that is wiped and reset every night.
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <button type="button" disabled={busy !== null} onClick={() => post("/api/auth/demo", { role: "client" }, "demo-client")} className={btn.dark}>
            {busy === "demo-client" ? "Signing in..." : "Demo client"}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => post("/api/auth/demo", { role: "admin" }, "demo-admin")} className={btn.outline}>
            {busy === "demo-admin" ? "Signing in..." : "Demo admin"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate">Client: book, reschedule and cancel. Admin: schedule, barber availability, services and hours.</p>
      </section>

      <section aria-label="Your account">
        <div role="tablist" aria-label="Sign in or create an account" className="mb-6 grid grid-cols-2 rounded-control bg-mist p-1">
          {(["signin", "register"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`min-h-11 rounded-[0.55rem] font-semibold transition-colors ${mode === m ? "bg-white text-ink shadow-sm" : "text-slate hover:text-ink"}`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form
          className="grid gap-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "signin") void post("/api/auth/login", { email: form.email, password: form.password }, "form");
            else void post("/api/auth/register", { name: form.name, email: form.email, phone: form.phone, password: form.password }, "form");
          }}
        >
          {mode === "register" && (
            <div>
              <label htmlFor="a-name" className={label}>
                Your name
              </label>
              <input id="a-name" className={field} value={form.name} onChange={set("name")} autoComplete="name" required />
            </div>
          )}
          <div>
            <label htmlFor="a-email" className={label}>
              Email
            </label>
            <input id="a-email" className={field} type="email" value={form.email} onChange={set("email")} autoComplete="email" inputMode="email" required />
          </div>
          {mode === "register" && (
            <div>
              <label htmlFor="a-phone" className={label}>
                Mobile number <span className="font-normal text-slate">(optional, saves typing when you book)</span>
              </label>
              <input id="a-phone" className={field} type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="01712 345 678" />
            </div>
          )}
          <div>
            <label htmlFor="a-pass" className={label}>
              Password {mode === "register" && <span className="font-normal text-slate">(at least 8 characters)</span>}
            </label>
            <input
              id="a-pass"
              className={field}
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
            />
          </div>
          {error && (
            <p role="alert" className="font-semibold text-bad">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy !== null} className={btn.primary}>
            {busy === "form" ? "One moment..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </div>
  );
}
