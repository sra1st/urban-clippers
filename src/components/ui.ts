// Shared class strings so buttons and fields look identical everywhere.
const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 py-3 font-semibold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const btn = {
  primary: `${base} bg-pole text-ink hover:bg-[#e2b560]`,
  dark: `${base} bg-ink text-white hover:bg-ink-3`,
  outline: `${base} border-2 border-ink text-ink hover:bg-ink hover:text-white`,
  outlineLight: `${base} border-2 border-white/70 text-white hover:bg-white hover:text-ink`,
  quiet: `${base} text-ink hover:bg-mist`,
  small: "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
};

export const field =
  "block w-full min-h-12 rounded-control border-2 border-line bg-white px-4 py-3 text-base text-ink placeholder:text-slate/70 focus:border-ink-3 focus:outline-none focus-visible:outline-none";

export const label = "mb-1.5 block text-sm font-semibold text-ink";
