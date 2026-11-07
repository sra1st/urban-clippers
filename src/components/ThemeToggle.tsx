"use client";

import { useSyncExternalStore } from "react";

const KEY = "uc-theme";

function subscribe(cb: () => void) {
  window.addEventListener("uc-theme", cb);
  return () => window.removeEventListener("uc-theme", cb);
}
const isDark = () => document.documentElement.dataset.theme === "dark";

export function useDark(): [boolean, () => void] {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const toggle = () => {
    const next = !isDark();
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    window.dispatchEvent(new Event("uc-theme"));
  };
  return [dark, toggle];
}

const Moon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
const Sun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

/** The moon button. Shows a sun while dark mode is on, to switch back. */
export function ThemeToggle({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const [dark, toggle] = useDark();
  return (
    <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className={className}>
      {withLabel ? <span>{dark ? "Light mode" : "Dark mode"}</span> : dark ? <Sun /> : <Moon />}
    </button>
  );
}
