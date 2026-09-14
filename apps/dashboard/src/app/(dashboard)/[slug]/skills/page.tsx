import type { Metadata } from "next";

import { SkillPageTransition } from "@/components/skills/skill-page-transition";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Skills",
};

async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <SkillPageTransition>
      <PageClient slug={slug} />
    </SkillPageTransition>
  );
}

export default Page;
