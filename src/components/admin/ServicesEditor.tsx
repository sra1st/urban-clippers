"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { btn, field, label } from "../ui";

export type AdminService = { id: number; category: string; name: string; description: string; price: number; isActive: boolean };

function ServiceForm({
  initial,
  categories,
  submitLabel,
  onSubmit,
}: {
  initial: Omit<AdminService, "id">;
  categories: string[];
  submitLabel: string;
  onSubmit: (s: Omit<AdminService, "id">) => Promise<string | null>;
}) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const id = useId();
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const err = await onSubmit({ ...s, price: Number(s.price) });
        setMsg(err ? { ok: false, text: err } : { ok: true, text: "Saved" });
        setBusy(false);
      }}
    >
      <div>
        <label htmlFor={`${id}n`} className={label}>
          Name
        </label>
        <input id={`${id}n`} className={field} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} maxLength={100} required />
      </div>
      <div className="grid grid-cols-[1fr_8rem] gap-3">
        <div>
          <label htmlFor={`${id}c`} className={label}>
            Category
          </label>
          <input id={`${id}c`} className={field} list={`${id}l`} value={s.category} onChange={(e) => setS({ ...s, category: e.target.value })} maxLength={40} required />
          <datalist id={`${id}l`}>
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor={`${id}p`} className={label}>
            Price (৳)
          </label>
          <input id={`${id}p`} className={field} type="number" inputMode="numeric" min={0} max={100000} step={10} value={s.price} onChange={(e) => setS({ ...s, price: e.target.value === "" ? 0 : Number(e.target.value) })} required />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}d`} className={label}>
          Description
        </label>
        <input id={`${id}d`} className={field} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} maxLength={240} />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-semibold">
          <input type="checkbox" className="size-5 accent-[#15181d]" checked={s.isActive} onChange={(e) => setS({ ...s, isActive: e.target.checked })} />
          Show on the website
        </label>
        <button type="submit" disabled={busy || (!dirty && submitLabel === "Save")} className={`${btn.dark} ml-auto`}>
          {busy ? "Saving..." : submitLabel}
        </button>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm font-semibold ${msg.ok ? "text-ok" : "text-bad"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}

export function ServicesEditor({ services, categories }: { services: AdminService[]; categories: string[] }) {
  const router = useRouter();

  async function send(url: string, method: "POST" | "PATCH", s: Omit<AdminService, "id">): Promise<string | null> {
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      if (res.ok) {
        router.refresh();
        return null;
      }
      return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save.";
    } catch {
      return "Couldn't reach the server.";
    }
  }

  return (
    <div className="space-y-6">
      <details className="rounded-panel border-2 border-ink bg-white">
        <summary className="flex min-h-14 cursor-pointer items-center justify-between px-5 font-bold">
          + Add a service
          <span className="text-sm font-normal text-slate">New services appear on the website straight away</span>
        </summary>
        <div className="border-t border-line p-5">
          <ServiceForm
            key={services.length}
            initial={{ category: categories[0] ?? "Haircuts", name: "", description: "", price: 0, isActive: true }}
            categories={categories}
            submitLabel="Add service"
            onSubmit={(s) => send("/api/admin/services", "POST", s)}
          />
        </div>
      </details>

      <ul className="space-y-4">
        {services.map((s) => (
          <li key={s.id} className={`rounded-panel border-2 bg-white p-5 ${s.isActive ? "border-line" : "border-dashed border-line opacity-80"}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl">{s.name}</h2>
              {!s.isActive && <span className="rounded-chip bg-mist px-3 py-1 text-sm font-bold text-slate">Hidden</span>}
            </div>
            <ServiceForm
              initial={{ category: s.category, name: s.name, description: s.description, price: s.price, isActive: s.isActive }}
              categories={categories}
              submitLabel="Save"
              onSubmit={(v) => send(`/api/admin/services/${s.id}`, "PATCH", v)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
