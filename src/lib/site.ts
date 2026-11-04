// Public business details. Replace these with your own before sharing the site widely.
export const SITE = {
  name: "Urban Clippers",
  tagline: "Men's grooming studio",
  phone: "+880 1700-000000",
  phoneHref: "tel:+8801700000000",
  whatsappHref: "https://wa.me/8801700000000",
  email: "hello@urbanclippers.example",
  addressLines: ["Level 2, Urban Plaza", "Road 11, Dhaka"],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Small "portfolio demo" notice near the booking form and in the footer. */
  demoNotice: process.env.NEXT_PUBLIC_DEMO_NOTICE !== "false",
};

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${SITE.name}, ${SITE.addressLines.join(", ")}`,
)}`;

export const DEMO_CLIENT_EMAIL = "demo-client@urbanclippers.demo";
export const DEMO_ADMIN_EMAIL = "demo-admin@urbanclippers.demo";
