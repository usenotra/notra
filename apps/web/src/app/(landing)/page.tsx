import type { Metadata } from "next";

import { AnswerExampleSection } from "@/components/landing/answer-example-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { LogoMarquee } from "@/components/landing/logo-marquee";
import { LandingPricingSection } from "@/components/landing/pricing-section";
import { TestimonialsGate } from "@/components/landing/testimonials-gate";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { FAQ_CONTENT } from "@/constants/landing/faq";
import {
  NOTRA_CONTACT_EMAIL,
  NOTRA_SAME_AS,
  NOTRA_SUPPORT_EMAIL,
  siteUrl,
} from "@/utils/agent-metadata";
import { serializeJsonLd } from "@/utils/jsonld";
import { SITE_DESCRIPTION, SITE_TITLE, pageAlternates } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: pageAlternates(SITE_URL),
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Notra",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  creator: {
    "@type": "Organization",
    name: "Notra",
    url: SITE_URL,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Notra",
  url: SITE_URL,
  logo: siteUrl("/notra-mark.svg"),
  description: SITE_DESCRIPTION,
  sameAs: NOTRA_SAME_AS,
  contactPoint: [
    {
      "@type": "ContactPoint",
      email: NOTRA_CONTACT_EMAIL,
      contactType: "sales",
      availableLanguage: ["en"],
    },
    {
      "@type": "ContactPoint",
      email: NOTRA_SUPPORT_EMAIL,
      contactType: "customer support",
      availableLanguage: ["en"],
    },
  ],
  address: {
    "@type": "PostalAddress",
    addressCountry: "US",
    addressRegion: "Delaware",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Notra GEO platform",
  provider: organizationJsonLd,
  serviceType: "AI visibility tracking platform",
  areaServed: "Worldwide",
  description: SITE_DESCRIPTION,
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_CONTENT.items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const speakableJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: SITE_TITLE,
  url: SITE_URL,
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", "#agent-readable-summary"],
  },
};

function LandingPageJsonLd() {
  return (
    <>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SSR'd JSON-LD payload, escaped via serializeJsonLd
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SSR'd JSON-LD payload, escaped via serializeJsonLd
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(organizationJsonLd),
        }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SSR'd JSON-LD payload, escaped via serializeJsonLd
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SSR'd JSON-LD payload, escaped via serializeJsonLd
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SSR'd JSON-LD payload, escaped via serializeJsonLd
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(speakableJsonLd) }}
        type="application/ld+json"
      />
    </>
  );
}

export default function LandingPage() {
  return (
    <div className="dark:bg-background flex w-full flex-col items-stretch justify-start overflow-x-clip bg-white">
      <LandingPageJsonLd />
      <main className="landing-tables flex w-full flex-col items-stretch justify-start">
        <HeroSection />
        <p className="sr-only" id="agent-readable-summary">
          {SITE_DESCRIPTION}
        </p>
        <LogoMarquee />
        <section id="features">
          <FeaturesSection />
        </section>
        <section id="answers">
          <AnswerExampleSection />
        </section>
        <TestimonialsGate>
          <section id="testimonials">
            <TestimonialsSection />
          </section>
        </TestimonialsGate>
        <div>
          <LandingPricingSection />
        </div>
        <section id="faq">
          <FaqSection />
        </section>
        <section className="px-6 pt-27.5 pb-27.5 lg:px-20" id="cta">
          <CtaBanner />
        </section>
      </main>
    </div>
  );
}
