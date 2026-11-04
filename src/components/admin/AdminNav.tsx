"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Schedule" },
  { href: "/admin/availability", label: "Barber availability" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/hours", label: "Opening hours" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:px-5">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-[3px] px-3 py-3 text-[15px] font-semibold transition-colors ${
              active ? "border-pole text-white" : "border-transparent text-white/65 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
