import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | Men's grooming studio with online booking`, template: `%s | ${SITE.name}` },
  description: "Haircuts, beard trims, hot towel shaves and facials. See the real free times and book in under a minute. Open every night until 11 PM.",
  // This is a portfolio project: keep it out of search results. Remove this line to allow indexing.
  robots: { index: false, follow: false },
  openGraph: {
    title: `${SITE.name} | Men's grooming studio`,
    description: "See the real free times and book your chair in under a minute.",
    type: "website",
    siteName: SITE.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#15181d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies a saved dark-mode choice before the first paint, so there is no light flash. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('uc-theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}" }} />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
