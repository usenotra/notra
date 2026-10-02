import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { changelog } from "@/../.source/server";
import {
  buildChangelogTimelineItems,
  getNotraChangelogPostBySlug,
  listNotraChangelogPosts,
} from "@/utils/changelog";
import {
  getShowcaseCompany,
  getShowcaseEntrySlug,
  SHOWCASE_COMPANIES,
} from "@/utils/showcase";

export const getShowcaseOverview = createServerFn({ method: "GET" }).handler(
  () => {
    const postCounts = new Map(
      SHOWCASE_COMPANIES.map((company) => [
        company.slug,
        changelog.filter((entry) =>
          entry.info.path.startsWith(`${company.slug}/`)
        ).length,
      ])
    );

    return SHOWCASE_COMPANIES.slice()
      .sort((left, right) => {
        const countDifference =
          (postCounts.get(right.slug) ?? 0) - (postCounts.get(left.slug) ?? 0);

        if (countDifference !== 0) {
          return countDifference;
        }

        return left.name.localeCompare(right.name);
      })
      .map((company) => ({
        ...company,
        entryCount: postCounts.get(company.slug) ?? 0,
      }));
  }
);

export const getNotraChangelogTimeline = createServerFn({
  method: "GET",
}).handler(async () =>
  buildChangelogTimelineItems(await listNotraChangelogPosts())
);

export const getNotraChangelogEntry = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data: { slug } }) => {
    const post = await getNotraChangelogPostBySlug(slug);
    if (!post) {
      throw notFound();
    }

    return { post, path: `${slug}.mdx` };
  });

export const getShowcaseCompanyChangelog = createServerFn({ method: "GET" })
  .validator(z.object({ name: z.string() }))
  .handler(({ data: { name } }) => {
    const company = getShowcaseCompany(name);

    if (!company) {
      throw notFound();
    }

    const items = changelog
      .filter((entry) => entry.info.path.startsWith(`${name}/`))
      .sort(
        (left, right) =>
          new Date(right.date).getTime() - new Date(left.date).getTime()
      )
      .map((entry) => ({
        id: entry.info.path,
        title: entry.title,
        description: entry.description,
        href: `/changelog/${name}/${getShowcaseEntrySlug(entry.info.path)}`,
        date: entry.date,
      }));

    return { company, items };
  });

export const getShowcaseChangelogEntry = createServerFn({ method: "GET" })
  .validator(z.object({ name: z.string(), slug: z.string() }))
  .handler(({ data: { name, slug } }) => {
    const company = getShowcaseCompany(name);
    const path = `${name}/${slug}.mdx`;
    const entry = changelog.find((item) => item.info.path === path);

    if (!company || !entry) {
      throw notFound();
    }

    return {
      company,
      name,
      slug,
      path,
      entry: {
        title: entry.title,
        description: entry.description,
        date: entry.date,
      },
    };
  });
