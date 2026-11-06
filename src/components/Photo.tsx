"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Shows /images/<name>.<ext>: a .jpg photo by default, or an animated .gif when ext="gif".
 * If that file is missing or fails to load on a device, it falls back to the still placeholder
 * /images/placeholders/<name>.svg, so the site never has a broken image.
 */
export function Photo({
  name,
  alt,
  sizes = "100vw",
  priority = false,
  className = "",
  ext = "jpg",
}: {
  name: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  ext?: "jpg" | "gif";
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // The photo may have failed before React attached the error handler.
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <Image
      ref={ref}
      src={failed ? `/images/placeholders/${name}.svg` : `/images/${name}.${ext}`}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={failed || ext === "gif"}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
