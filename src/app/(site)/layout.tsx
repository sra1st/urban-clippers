import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StickyBook } from "@/components/StickyBook";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-white focus:px-4 focus:py-2 focus:font-semibold">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <StickyBook />
    </>
  );
}
