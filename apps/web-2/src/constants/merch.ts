import type {
  MerchClaimStep,
  MerchGalleryImage,
  MerchHeroCallout,
  MerchSpecRow,
} from "@/types/merch";

export const MERCH_HERO_CALLOUTS: MerchHeroCallout[] = [
  {
    number: "02",
    label: "Low, unstructured crown",
    className: "-translate-x-[27.25rem] top-[7rem] left-1/2",
  },
  {
    number: "01",
    label: "Embroidered mark",
    className: "-translate-x-[28.5rem] top-[22rem] left-1/2",
  },
];

export const MERCH_GALLERY_IMAGES: MerchGalleryImage[] = [
  {
    src: "/marketing/merch/life-side.jpg",
    alt: "Side profile of someone wearing the Notra Classic Hat in stone",
  },
  {
    src: "/marketing/merch/life-brim-pink.jpg",
    alt: "Someone adjusting the brim of the Notra Classic Hat in pink",
    offsetClassName: "sm:mt-18",
  },
  {
    src: "/marketing/merch/life-front-white.jpg",
    alt: "Front view of someone wearing the Notra Classic Hat in white",
    offsetClassName: "sm:mt-9",
  },
];

export const MERCH_PHOTO_CREDIT = "Product photography © Fourthwall, Inc.";

export const MERCH_TWEET_IDS = [
  "2080746602642211029",
  "2081755331026182607",
  "2082079045374574904",
];

export const MERCH_SPEC_ROWS: MerchSpecRow[] = [
  { label: "Fabric", value: "100% chino cotton twill" },
  { label: "Profile", value: "Low, unstructured" },
  { label: "Closure", value: "Antique buckle strap" },
  { label: "Sizing", value: "One size fits most" },
  { label: "Colors", value: "Stone, Pink, White" },
  { label: "Front", value: "Embroidered Notra mark" },
];

export const MERCH_CLAIM_STEPS: MerchClaimStep[] = [
  {
    number: "1",
    title: "Be on a paid plan",
    body: "Basic, Pro, or Enterprise all count. Free trials don't, so finish your trial first.",
  },
  {
    number: "2",
    title: "Reach out to us",
    body: "Use the feedback form in your workspace, ping us on Slack, or reach out via the contact page. Tell us where to send it.",
  },
  {
    number: "3",
    title: "We ship it",
    body: "One hat per workspace, on us. US addresses only for now; international friends, soon. Wear it in your next launch video.",
  },
];
