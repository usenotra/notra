import { createFileRoute } from "@tanstack/react-router";

import { ContactDeveloperNote } from "@/components/contact/contact-developer-note";
import { ContactEmail } from "@/components/contact/contact-email";
import { ContactForm } from "@/components/contact/contact-form";
import { ContactResources } from "@/components/contact/contact-resources";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { CONTACT_RESPONSE_TIME } from "@/constants/contact";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Contact Notra";
const description =
  "Talk to the Notra team about sales, support, security disclosures, partnerships and developer integration help. A real human writes back.";
const url = `${SITE_URL}/contact`;

const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates(url),
  openGraph: {
    title,
    description,
    url,
    type: "website",
    siteName: "Notra",
    images: [PAGE_SOCIAL_IMAGES.contact],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.contact.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

export const Route = createFileRoute("/_site/contact")({
  head: () => buildHead(metadata),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="flex w-full flex-col items-center gap-8 pb-2">
      <MarketingHeroWash
        subtitle={
          <>
            Tell us what you're working on and a real human will write back.{" "}
            {CONTACT_RESPONSE_TIME}
          </>
        }
        title={
          <>
            We read every message. Let's{" "}
            <span className="text-primary">talk</span>.
          </>
        }
      />

      <section className="mx-auto grid w-[min(100%-3rem,80rem)] grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_32.5rem]">
        <ContactForm />
        <div className="flex flex-col gap-6">
          <ContactEmail />
          <ContactResources />
          <ContactDeveloperNote />
        </div>
      </section>
    </div>
  );
}
