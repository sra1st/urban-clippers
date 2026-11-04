"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Shows /images/<name>.jpg. Until that photo exists it shows the illustrated placeholder
 * /images/placeholders/<name>.svg, so the site never has a broken image.
 */
export function Photo({
  name,
  alt,
  sizes = "100vw",
  priority = false,
  className = "",
}: {
  name: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
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
      src={failed ? `/images/placeholders/${name}.svg` : `/images/${name}.jpg`}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={failed}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
