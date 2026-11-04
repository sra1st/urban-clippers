"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="on-dark grid min-h-dvh place-items-center bg-ink px-6 text-center text-white">
      <div>
        <div className="pole-band mx-auto mb-8 h-2 w-24 rounded-full" aria-hidden="true" />
        <h1 className="text-4xl">Something went wrong on our side</h1>
        <p className="mx-auto mt-3 max-w-sm text-white/75">It&apos;s not you. Please try again in a moment. If it keeps happening, call the studio.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="inline-flex min-h-12 items-center rounded-control bg-pole px-6 font-semibold text-ink">
            Try again
          </button>
          <Link href="/" className="inline-flex min-h-12 items-center rounded-control border-2 border-white/70 px-6 font-semibold">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
