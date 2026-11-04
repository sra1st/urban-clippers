"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { btn } from "./ui";

/** Mobile-only bar that keeps "Book now" under the thumb. Hidden where a booking is already in progress. */
export function StickyBook() {
  const path = usePathname();
  if (path.startsWith("/book") || path.startsWith("/login") || path.startsWith("/register")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex max-w-md gap-2">
        <Link href="/book" className={`${btn.primary} flex-1`}>
          Book your slot
        </Link>
        <a href={SITE.phoneHref} className={`${btn.outline} !px-4`} aria-label={`Call ${SITE.name}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
