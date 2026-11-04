import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/Header";
import { SignOutButton } from "@/components/SignOutButton";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null);
  if (!user || user.role !== "admin") redirect("/login?next=/admin");

  return (
    <div className="min-h-dvh bg-paper">
      <header className="on-dark sticky top-0 z-40 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-chip bg-pole px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-ink">Admin</span>
          </div>
          <div className="flex items-center gap-1 text-[15px]">
            <Link href="/" className="hidden whitespace-nowrap rounded-control px-3 py-2 font-semibold text-white/80 hover:bg-white/10 hover:text-white sm:block">
              View site
            </Link>
            <SignOutButton className="whitespace-nowrap rounded-control px-3 py-2 font-semibold text-white/60 hover:bg-white/10 hover:text-white" />
          </div>
        </div>
        <AdminNav />
      </header>
      {user.isDemo && (
        <p className="bg-pole px-4 py-2 text-center text-sm font-semibold text-ink">
          Demo admin account. Anything you change here is wiped and reset every night, so feel free to click around.
        </p>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
