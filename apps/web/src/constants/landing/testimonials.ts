import type { Testimonial } from "@/types/landing/testimonials";

export const TESTIMONIALS_SUBHEADING =
  "They use Notra for changelogs and launch posts every week. Here is what they say.";

export const FEATURED_TESTIMONIAL: Testimonial = {
  quote:
    '"Notra is connected to our entire content pipeline. It creates valuable content from our PRs that our audience actually want to read. There\'s now no more relevant features that are shipped and not talk about. Notra closes that loop for us."',
  name: "Will De Ath",
  role: "Head of Growth, Inth (YC P26)",
  avatar: "/testimonials/Will.webp",
  avatarAlt: "Will De Ath",
  shader: {
    size: 11,
    colorFront: "#FFFC0033",
    className:
      "pointer-events-none absolute left-176 top-179.25 h-[49.0375rem] w-226.5 origin-top-left rotate-[270deg]",
  },
};

export const PAIR_TESTIMONIALS: Testimonial[] = [
  {
    quote:
      '"Super easy to get regular marketing content as a baseline. We don\'t push the content directly, but take it as inspiration and baseline to then make edits. It basically aggregates our development into posts."',
    name: "Glenn Töws",
    role: "Founder, stagewise (YC S25)",
    avatar: "/marketing/landing/glenn-tows.webp",
    avatarAlt: "Glenn Töws",
    shader: {
      size: 5,
      colorFront: "#0051FF26",
      className:
        "pointer-events-none absolute -left-17.75 top-36.25 h-196.25 w-226.5 opacity-[0.95]",
    },
  },
  {
    quote:
      '"Its literally removed the hassle of writing changelogs completely. i just have a schedule run once a week and auto update on my website. with some custom instructions it sounds just like i want it to sound."',
    name: "Jan Burzinski",
    role: "Founder, bejanic.de",
    avatar: "/marketing/landing/jan-burzinski.webp",
    avatarAlt: "Jan Burzinski",
    shader: {
      size: 5,
      colorFront: "#25FF0026",
      className:
        "pointer-events-none absolute -left-17.75 top-36.25 h-196.25 w-226.5",
    },
  },
];

export const LANDING_TESTIMONIALS_FLAG_KEY = "landing-testimonials";
