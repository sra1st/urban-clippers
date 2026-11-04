"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HoursRow } from "@/lib/availability";
import { btn, field } from "../ui";

const NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export function HoursEditor({ initial }: { initial: HoursRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = (weekday: number, p: Partial<HoursRow>) => setRows((r) => r.map((x) => (x.weekday === weekday ? { ...x, ...p } : x)));
  const dirty = JSON.stringify(rows) !== JSON.stringify(initial);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/hours", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rows) });
      if (res.ok) {
        setMsg({ ok: true, text: "Saved. The booking calendar and the website now use these hours." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save." });
      }
    } catch {
      setMsg({ ok: false, text: "Couldn't reach the server." });
    }
    setBusy(false);
  }

  return (
    <div>
      <ul className="divide-y divide-line overflow-hidden rounded-panel border-2 border-line bg-white">
        {MON_FIRST.map((d) => {
          const r = rows.find((x) => x.weekday === d)!;
          return (
            <li key={d} className="grid items-center gap-3 px-4 py-4 sm:grid-cols-[9rem_auto_1fr] sm:px-5">
              <p className="font-display text-xl font-bold">{NAMES[d]}</p>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-semibold">
                <input type="checkbox" className="size-5 accent-[#15181d]" checked={!r.closed} onChange={(e) => patch(d, { closed: !e.target.checked })} />
                Open
              </label>
              <div className={`flex items-center gap-2 ${r.closed ? "pointer-events-none opacity-40" : ""}`}>
                <label className="sr-only" htmlFor={`o${d}`}>
                  {NAMES[d]} opens
                </label>
                <input id={`o${d}`} type="time" step={1800} className={`${field} !w-auto`} value={r.open} onChange={(e) => patch(d, { open: e.target.value })} disabled={r.closed} />
                <span aria-hidden="true">to</span>
                <label className="sr-only" htmlFor={`c${d}`}>
                  {NAMES[d]} closes
                </label>
                <input id={`c${d}`} type="time" step={1800} className={`${field} !w-auto`} value={r.close} onChange={(e) => patch(d, { close: e.target.value })} disabled={r.closed} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={busy || !dirty} className={btn.primary}>
          {busy ? "Saving..." : "Save hours"}
        </button>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`font-semibold ${msg.ok ? "text-ok" : "text-bad"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
