"use client";

import { useEffect, useState } from "react";
import type { HoursRow } from "@/lib/availability";
import { getOpenStatus, type OpenStatus } from "@/lib/hours-format";

export function OpenNow({ hours, tone = "dark" }: { hours: HoursRow[]; tone?: "dark" | "light" }) {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    const tick = () => setStatus(getOpenStatus(hours));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  // Reserve the space until the browser knows the time, so nothing jumps.
  if (!status) return <span className="inline-block h-6 w-44" aria-hidden="true" />;

  return (
    <span className={`inline-flex items-center gap-2 text-sm font-semibold ${tone === "dark" ? "text-white" : "text-ink"}`}>
      <span className={`size-2.5 rounded-full ${status.open ? "bg-[#3ddc84]" : "bg-slate"}`} aria-hidden="true" />
      {status.text}
    </span>
  );
}
