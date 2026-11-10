// Default content. Used by the seed/reset scripts and as a display fallback if the database is unreachable.
export type SeedService = {
  id: number;
  category: string;
  name: string;
  description: string;
  price: number;
  sort: number;
};

export const BARBERS = [
  { id: 1, name: "Roton", note: "Classic cuts and clean scissor work." },
  { id: 2, name: "Anis", note: "Skin fades and sharp line-ups." },
  { id: 3, name: "Akhter", note: "Beard shaping and hot towel shaves." },
  { id: 4, name: "Sohel", note: "Kids cuts and relaxed head massages." },
];

export const CATEGORIES = ["Haircuts", "Beard and shave", "Facial and skin", "Hair care", "Massage", "Packages"];

export const SERVICES: SeedService[] = [
  { id: 1, category: "Haircuts", name: "Classic haircut", description: "Scissor and clipper cut, neck shave and styling.", price: 400, sort: 10 },
  { id: 2, category: "Haircuts", name: "Skin fade", description: "Tight skin fade or taper, blended and lined up.", price: 600, sort: 20 },
  { id: 3, category: "Haircuts", name: "Kids haircut (under 12)", description: "Patient, quick and tidy.", price: 300, sort: 30 },
  { id: 4, category: "Beard and shave", name: "Beard trim and shape", description: "Trim, shape and line up with a hot towel finish.", price: 250, sort: 40 },
  { id: 5, category: "Beard and shave", name: "Hot towel shave", description: "Straight-razor shave, hot towel and aftershave balm.", price: 350, sort: 50 },
  { id: 6, category: "Facial and skin", name: "Classic facial", description: "Deep cleanse, scrub, steam and face massage.", price: 800, sort: 60 },
  { id: 7, category: "Facial and skin", name: "Charcoal detox facial", description: "Charcoal mask for oily or tired skin, with eye and neck care.", price: 1200, sort: 70 },
  { id: 8, category: "Hair care", name: "Hair colour", description: "Natural black or brown shades, mixed for your hair.", price: 1000, sort: 80 },
  { id: 9, category: "Hair care", name: "Hair spa", description: "Wash, deep conditioning mask and scalp steam.", price: 1200, sort: 90 },
  { id: 10, category: "Massage", name: "Head massage", description: "Scalp, neck and shoulder massage with warm oil.", price: 300, sort: 100 },
  { id: 11, category: "Packages", name: "Haircut and beard", description: "Classic haircut with a beard trim and shape.", price: 600, sort: 110 },
  { id: 12, category: "Packages", name: "Groom package", description: "Haircut, beard trim and a head massage.", price: 850, sort: 120 },
];

/** Open every day 10:00 to 23:00. weekday 0 = Sunday. */
export const HOURS = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  closed: false,
  open: "10:00",
  close: "23:00",
}));

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Invented customers for the demo schedule. */
