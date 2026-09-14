import type { Metadata } from "next";

import { SkillPageTransition } from "@/components/skills/skill-page-transition";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Skill",
};

async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return (
    <SkillPageTransition>
      <PageClient skillId={id} slug={slug} />
    </SkillPageTransition>
  );
}

export default Page;
