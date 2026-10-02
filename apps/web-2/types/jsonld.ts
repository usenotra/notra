export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface ArticleJsonLdInput {
  url: string;
  title: string;
  description: string;
  imageUrl: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  type?: "Article" | "BlogPosting" | "TechArticle" | "NewsArticle";
}

export interface OfferLike {
  "@type": "Offer" | "AggregateOffer";
  name?: string;
  description?: string;
  price?: number;
  priceCurrency?: string;
  priceSpecification?: unknown;
  url?: string;
  availability?: string;
  category?: string;
  itemCondition?: string;
  hasMerchantReturnPolicy?: MerchantReturnPolicyLike;
}

interface MerchantReturnPolicyLike {
  "@type": "MerchantReturnPolicy";
  applicableCountry: string | readonly string[];
  merchantReturnDays?: number;
  refundType?: string;
  returnPolicyCategory: string;
}

export interface ProductJsonLdInput {
  name: string;
  description: string;
  image?: string | string[];
  url: string;
  offers: OfferLike | OfferLike[];
}
