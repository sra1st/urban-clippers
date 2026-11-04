"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({ className = "", label = "Sign out" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className={className}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          router.push("/");
          router.refresh();
          setBusy(false);
        }
      }}
    >
      {busy ? "Signing out" : label}
    </button>
  );
}
