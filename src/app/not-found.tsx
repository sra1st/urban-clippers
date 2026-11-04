import Link from "next/link";
import { SITE } from "@/lib/site";

export default function NotFound() {
  return (
    <main className="on-dark grid min-h-dvh place-items-center bg-ink px-6 text-center text-white">
      <div>
        <div className="pole-band mx-auto mb-8 h-2 w-24 rounded-full" aria-hidden="true" />
        <p className="font-display text-7xl font-extrabold text-pole">404</p>
        <h1 className="mt-2 text-4xl">That page isn&apos;t here</h1>
        <p className="mx-auto mt-3 max-w-sm text-white/75">The link may be old or mistyped. Let&apos;s get you back to a chair.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/book" className="inline-flex min-h-12 items-center rounded-control bg-pole px-6 font-semibold text-ink">
            Book your slot
          </Link>
          <Link href="/" className="inline-flex min-h-12 items-center rounded-control border-2 border-white/70 px-6 font-semibold">
            {SITE.name} home
          </Link>
        </div>
      </div>
    </main>
  );
}
