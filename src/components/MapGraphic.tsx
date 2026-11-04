import { SITE } from "@/lib/site";

/** A simple illustrated map. Swap it for an embedded map or a screenshot once you have a real address. */
export function MapGraphic({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 480" role="img" aria-label={`Map showing ${SITE.name} on ${SITE.addressLines[1]}`} className={className}>
      <rect width="640" height="480" fill="#ebe6dc" />
      <g fill="#f6f3ee">
        <rect x="24" y="24" width="170" height="120" rx="10" />
        <rect x="226" y="24" width="150" height="120" rx="10" />
        <rect x="408" y="24" width="208" height="120" rx="10" />
        <rect x="24" y="178" width="170" height="130" rx="10" />
        <rect x="408" y="178" width="208" height="130" rx="10" />
        <rect x="24" y="342" width="170" height="114" rx="10" />
        <rect x="226" y="342" width="390" height="114" rx="10" />
      </g>
      <rect x="226" y="178" width="150" height="130" rx="10" fill="#cfe3d6" />
      <g stroke="#fff" strokeWidth="14" strokeLinecap="round">
        <path d="M0 160h640" />
        <path d="M0 325h640" />
        <path d="M210 0v480" />
        <path d="M392 0v480" />
      </g>
      <path d="M0 160h640" stroke="#d8d0c1" strokeWidth="2" strokeDasharray="10 12" />
      <path d="M392 0v480" stroke="#d8d0c1" strokeWidth="2" strokeDasharray="10 12" />
      <g transform="translate(392 160)">
        <circle r="34" fill="#b9852f" opacity="0.16" />
        <path d="M0 -4C-18 -4 -26 -18 -26 -30a26 26 0 0 1 52 0C26 -18 18 -4 0 -4z" transform="translate(0 -6)" fill="#b9852f" />
        <circle cy="-36" r="9" fill="#fff" />
      </g>
      <g fontFamily="Figtree Variable, system-ui, sans-serif" fontWeight="700" fill="#15181d">
        <text x="408" y="216" fontSize="20">{SITE.name}</text>
        <text x="408" y="238" fontSize="15" fill="#5c5a55">{SITE.addressLines[0]}</text>
      </g>
      <text x="16" y="150" fontFamily="Figtree Variable, system-ui, sans-serif" fontSize="12" fontWeight="600" fill="#5c5a55">Road 11</text>
    </svg>
  );
}
