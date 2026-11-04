import Link from "next/link";
import { getUser, type SessionUser } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { MobileMenu } from "./MobileMenu";
import { SignOutButton } from "./SignOutButton";
import { btn } from "./ui";

async function safeUser(): Promise<SessionUser | null> {
  try {
    return await getUser();
  } catch {
    return null;
  }
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 text-white ${className}`} aria-label={`${SITE.name} home`}>
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[10px] bg-ink-2 ring-1 ring-white/15">
        <span className="pole-band absolute inset-y-0 right-0 w-2" aria-hidden="true" />
        <span className="pr-2 font-display text-[15px] font-extrabold leading-none tracking-tight">UC</span>
      </span>
      <span className="font-display text-xl font-extrabold leading-none tracking-tight">{SITE.name}</span>
    </Link>
  );
}

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/location", label: "Location" },
  { href: "/contact", label: "Contact" },
];

export async function Header() {
  const user = await safeUser();
  const accountHref = user ? (user.role === "admin" ? "/admin" : "/account") : "/login";
  const accountLabel = user ? (user.role === "admin" ? "Admin" : "My bookings") : "Sign in";
  const mobileLinks = [...NAV, { href: "/find-booking", label: "Find my booking" }, { href: accountHref, label: accountLabel }];

  return (
    <header className="sticky top-0 z-40 bg-ink text-white">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-control px-3.5 py-2 font-semibold text-white/85 hover:bg-white/10 hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href={accountHref} className="hidden rounded-control px-3.5 py-2 font-semibold text-white/85 hover:bg-white/10 hover:text-white md:block">
            {accountLabel}
          </Link>
          {user && (
            <span className="hidden md:block">
              <SignOutButton className="rounded-control px-3.5 py-2 font-semibold text-white/60 hover:bg-white/10 hover:text-white" />
            </span>
          )}
          <Link href="/book" className={`${btn.primary} !min-h-10 !px-4 !py-2 text-[15px]`}>
            Book now
          </Link>
          <MobileMenu links={mobileLinks} />
        </div>
      </div>
    </header>
  );
}
