import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import { PageHeading } from "../src/components/layout/page-heading";
import { geoNavHref, isGeoDashboardPath } from "../src/utils/geo-paths";
import {
  canPrefetchSidebarModeHome,
  resolveOrgRootRedirect,
  resolveSidebarMode,
} from "../src/utils/nav";

describe("sidebar mode navigation", () => {
  test("Studio home drops the project query and must not restore it", () => {
    const studio = geoNavHref("workspace", "", "project-two");
    expect(studio).toBe("/workspace");
    expect(isGeoDashboardPath(studio)).toBe(false);
    expect(resolveOrgRootRedirect("workspace", "studio")).toBeNull();
    expect(resolveSidebarMode(undefined, "studio")).toBe("studio");
  });

  test("GEO homes retain project scope and still allow query restoration", () => {
    const geo = geoNavHref("workspace", "/geo", "project-two");
    expect(geo).toBe("/workspace/geo?project=project-two");
    expect(isGeoDashboardPath(geo)).toBe(true);
    expect(isGeoDashboardPath("/workspace/geo/prompts")).toBe(true);
    expect(resolveSidebarMode("geo/prompts", "studio")).toBe("geo");
  });

  test("shared pages keep the selected mode without GEO query restoration", () => {
    for (const route of ["content", "content/item", "automation/schedules"]) {
      expect(resolveSidebarMode(route, "geo")).toBe("geo");
      expect(resolveSidebarMode(route, "studio")).toBe("studio");
      expect(isGeoDashboardPath(`/workspace/${route}`)).toBe(false);
    }
  });

  test("Studio cannot prefetch a cookie-dependent GEO redirect", () => {
    expect(canPrefetchSidebarModeHome("studio")).toBe(false);
    expect(canPrefetchSidebarModeHome("geo")).toBe(true);
  });

  test("the mounted project switcher only reconciles query state on GEO", () => {
    const source = readFileSync(
      resolve(
        import.meta.dirname,
        "../src/components/dashboard/sidebar-project-switcher.tsx"
      ),
      "utf8"
    );
    expect(source).toMatch(
      /if \(!isGeoDashboardPath\(pathname\)\) \{\s*return;\s*\}/
    );
    expect(
      source.indexOf("setLastVisitedProject(slug, activeProject.id)")
    ).toBeLessThan(source.indexOf("!isGeoDashboardPath(pathname)"));
    expect(source.indexOf("!isGeoDashboardPath(pathname)")).toBeLessThan(
      source.indexOf("setProjectParam(restoredProjectId)")
    );
    expect(source).toContain("getLastVisitedProjectFromClient(slug)");
  });
});

describe("Content page typography", () => {
  test("Content uses the same heading in loaded and pending states as Schedules", () => {
    for (const file of ["page-client.tsx", "loading.tsx"]) {
      for (const page of ["content", "automation/schedules"]) {
        const source = readFileSync(
          resolve(
            import.meta.dirname,
            `../src/app/(dashboard)/[slug]/${page}/${file}`
          ),
          "utf8"
        );
        expect(source).toContain("<PageHeading");
        expect(source).not.toContain("<h1");
      }
    }
    const markup = renderToStaticMarkup(
      <PageHeading description="Description" title="Content" />
    );
    expect(markup).toContain(
      'class="text-2xl font-bold tracking-tight @min-[40rem]/main:text-3xl"'
    );
    expect(markup).toContain('class="text-muted-foreground text-sm"');
  });
});
