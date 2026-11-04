// Generates the illustrated placeholder images in public/images/placeholders.
// They are shown only until you add real photos with the same names (see README: "Photos to add").
// Run from the project folder:  node scripts/make-placeholders.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "public", "images", "placeholders");
mkdirSync(out, { recursive: true });

const S = 'fill="none" stroke="#ede6d8" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"';

const icons = {
  scissors: `<g ${S}><circle cx="690" cy="840" r="78"/><circle cx="910" cy="840" r="78"/><path d="M742 786 L930 330"/><path d="M858 786 L670 330"/></g><circle cx="800" cy="560" r="20" fill="#ede6d8"/>`,
  comb: `<g ${S}><rect x="480" y="470" width="640" height="130" rx="22"/><path d="M540 600v190M620 600v190M700 600v190M780 600v190M860 600v190M940 600v190M1020 600v190M1080 600v150"/></g>`,
  razor: `<g ${S}><rect x="430" y="690" width="400" height="90" rx="45"/><path d="M830 735 L1130 735 Q1160 735 1160 705 L1160 640 Q1000 640 830 700 Z"/><circle cx="830" cy="735" r="14" fill="#ede6d8"/></g>`,
  pole: `<g><rect x="680" y="250" width="240" height="700" rx="120" fill="#fff"/><clipPath id="pc"><rect x="680" y="250" width="240" height="700" rx="120"/></clipPath><g clip-path="url(#pc)" transform="rotate(-35 800 600)"><rect x="500" y="240" width="700" height="60" fill="#c8932f"/><rect x="500" y="360" width="700" height="60" fill="#2b3038"/><rect x="500" y="480" width="700" height="60" fill="#c8932f"/><rect x="500" y="600" width="700" height="60" fill="#2b3038"/><rect x="500" y="720" width="700" height="60" fill="#c8932f"/><rect x="500" y="840" width="700" height="60" fill="#2b3038"/></g><rect x="640" y="210" width="320" height="60" rx="18" fill="#ede6d8"/><rect x="640" y="930" width="320" height="60" rx="18" fill="#ede6d8"/></g>`,
  brush: `<g ${S}><path d="M720 760 L880 760 L860 560 L740 560 Z"/><path d="M700 560 Q800 330 900 560"/><path d="M730 770 L730 940 Q800 980 870 940 L870 770"/></g>`,
  mirror: `<g ${S}><ellipse cx="800" cy="520" rx="230" ry="290"/><ellipse cx="800" cy="520" rx="170" ry="230" stroke-width="6"/><path d="M800 810 L800 1010"/><path d="M720 1010 L880 1010"/></g>`,
  bottle: `<g ${S}><rect x="690" y="500" width="220" height="460" rx="40"/><rect x="740" y="400" width="120" height="100" rx="14"/><rect x="760" y="320" width="80" height="80" rx="12"/><rect x="730" y="640" width="140" height="190" rx="12" stroke-width="6"/></g>`,
  towel: `<g ${S}><path d="M520 560 Q800 470 1080 560 L1080 760 Q800 670 520 760 Z"/><path d="M520 660 Q800 570 1080 660"/><path d="M560 800 Q800 730 1040 800 L1040 880 Q800 810 560 880 Z"/></g>`,
};

const tints = [
  ["#2a2e35", "#121418"],
  ["#30343c", "#15171b"],
  ["#262a31", "#101215"],
  ["#2c3037", "#14161a"],
];

function svg(name, icon, i) {
  const [a, b] = tints[i % tints.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <pattern id="s" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="80" height="80" fill="none"/><rect width="14" height="80" fill="#fff" opacity="0.035"/></pattern>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0"/></filter>
  </defs>
  <rect width="1600" height="1200" fill="url(#g)"/>
  <rect width="1600" height="1200" fill="url(#s)"/>
  <circle cx="800" cy="600" r="430" fill="#fff" opacity="0.04"/>
  ${icon}
  <rect width="1600" height="1200" filter="url(#n)" opacity="0.6"/>
</svg>
`;
}

const files = {
  hero: "scissors",
  about: "pole",
  location: "mirror",
  "gallery-1": "scissors",
  "gallery-2": "comb",
  "gallery-3": "razor",
  "gallery-4": "pole",
  "gallery-5": "brush",
  "gallery-6": "mirror",
  "gallery-7": "bottle",
  "gallery-8": "towel",
};

Object.entries(files).forEach(([name, icon], i) => {
  writeFileSync(join(out, `${name}.svg`), svg(name, icons[icon], i));
});
console.log(`Wrote ${Object.keys(files).length} placeholders to ${out}`);
