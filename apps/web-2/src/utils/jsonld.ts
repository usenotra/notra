import type {
  ArticleJsonLdInput,
  BreadcrumbItem,
  OfferLike,
  ProductJsonLdInput,
} from "~types/jsonld";

import { JSON_LD_SCRIPT_CLOSE_REGEX, NOTRA_LOGO_PATH } from "@/utils/constants";
import { SITE_URL } from "@/utils/urls";

const NOTRA_PUBLISHER = {
  "@type": "Organization",
  name: "Notra",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}${NOTRA_LOGO_PATH}`,
  },
} as const;

function withMerchantReturnPolicy(offer: OfferLike): OfferLike {
  return {
    ...offer,
    hasMerchantReturnPolicy: offer.hasMerchantReturnPolicy ?? {
      "@type": "MerchantReturnPolicy",
      applicableCountry: [
        "US",
        "AT",
        "BE",
        "BG",
        "HR",
        "CY",
        "CZ",
        "DK",
        "EE",
        "FI",
        "FR",
        "DE",
        "GR",
        "HU",
        "IE",
        "IT",
        "LV",
        "LT",
        "LU",
        "MT",
        "NL",
        "PL",
        "PT",
        "RO",
        "SK",
        "SI",
        "ES",
        "SE",
      ],
      returnPolicyCategory:
        "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      refundType: "https://schema.org/FullRefund",
    },
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildArticleJsonLd({
  url,
  title,
  description,
  imageUrl,
  datePublished,
  dateModified,
  authorName,
  type = "Article",
}: ArticleJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    headline: title,
    description,
    image: imageUrl,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: authorName
      ? {
          "@type": "Organization",
          name: authorName,
        }
      : NOTRA_PUBLISHER,
    publisher: NOTRA_PUBLISHER,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    inLanguage: "en-US",
  };
}

export function buildProductJsonLd({
  name,
  description,
  image,
  url,
  offers,
}: ProductJsonLdInput) {
  const offersWithReturnPolicy = Array.isArray(offers)
    ? offers.map(withMerchantReturnPolicy)
    : withMerchantReturnPolicy(offers);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    ...(image ? { image } : {}),
    url,
    brand: {
      "@type": "Brand",
      name: "Notra",
    },
    offers: offersWithReturnPolicy,
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(JSON_LD_SCRIPT_CLOSE_REGEX, "<\\/$1");
}
