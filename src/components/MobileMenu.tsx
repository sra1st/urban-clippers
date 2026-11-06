"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const first = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (open) first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-control text-white hover:bg-white/10"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="absolute inset-x-0 top-full border-t border-white/10 bg-ink px-4 pb-4 pt-2 shadow-xl">
          <ul>
            {links.map((l, i) => (
              <li key={l.href}>
                <Link ref={i === 0 ? first : undefined} href={l.href} onClick={() => setOpen(false)} className="block rounded-control px-3 py-3.5 text-lg font-semibold text-white hover:bg-white/10">
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="sm:hidden">
              <ThemeToggle withLabel className="flex w-full items-center gap-3 rounded-control px-3 py-3.5 text-lg font-semibold text-white hover:bg-white/10" />
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
