export interface MerchGalleryImage {
  src: string;
  alt: string;
  offsetClassName?: string;
}

export interface MerchHeroCallout {
  number: string;
  label: string;
  className: string;
}

export interface MerchSpecRow {
  label: string;
  value: string;
}

export interface MerchClaimStep {
  number: string;
  title: string;
  body: string;
}
