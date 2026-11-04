import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/Photo";
import { btn } from "@/components/ui";

export const metadata: Metadata = { title: "Gallery", description: "Fades, classic cuts, beards and shaves from the chair." };

const TILES = [
  { name: "gallery-1", alt: "Scissor work on a classic cut", span: "md:col-span-2 md:row-span-2" },
  { name: "gallery-2", alt: "Combed and finished style", span: "" },
  { name: "gallery-3", alt: "Straight-razor shave", span: "" },
  { name: "gallery-4", alt: "The studio's barber pole", span: "" },
  { name: "gallery-5", alt: "Brush and lather for a hot towel shave", span: "" },
  { name: "gallery-6", alt: "A finished cut in the mirror", span: "md:col-span-2" },
  { name: "gallery-7", alt: "Aftershave and styling products", span: "" },
  { name: "gallery-8", alt: "Hot towel ready for a shave", span: "" },
];

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-4xl sm:text-6xl">Gallery</h1>
      <p className="mb-10 mt-3 max-w-2xl text-lg text-slate">Fades, classic cuts, beards and shaves, straight from the chair.</p>
      <ul className="grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] md:grid-cols-4">
        {TILES.map((t) => (
          <li key={t.name} className={`relative overflow-hidden rounded-panel bg-ink ${t.span}`}>
            <Photo name={t.name} alt={t.alt} sizes="(min-width: 768px) 25vw, 50vw" />
          </li>
        ))}
      </ul>
      <div className="mt-12">
        <Link href="/book" className={btn.primary}>
          Book your slot
        </Link>
      </div>
    </div>
  );
}
