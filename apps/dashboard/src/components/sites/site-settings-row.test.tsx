import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { SiteSettingsRow } from "./site-settings-row";

describe("SiteSettingsRow", () => {
  test("uses one responsive grid and control width for every field type", () => {
    const html = renderToStaticMarkup(
      <>
        <SiteSettingsRow htmlFor="name" label="Site name">
          <input defaultValue="Docs" id="name" name="name" type="text" />
        </SiteSettingsRow>
        <SiteSettingsRow
          description="The branch used for production deployments."
          htmlFor="branch"
          label="Production branch"
        >
          <input defaultValue="main" id="branch" name="branch" type="text" />
        </SiteSettingsRow>
        <SiteSettingsRow htmlFor="subdirectory" label="Use a subdirectory">
          <div className="flex lg:h-full lg:items-center">
            <input id="subdirectory" name="subdirectory" type="checkbox" />
          </div>
        </SiteSettingsRow>
        <SiteSettingsRow label="Publishing">
          <fieldset>
            <legend>Publish mode</legend>
            <label htmlFor="automatic">Automatic</label>
            <input id="automatic" name="publishMode" type="radio" />
          </fieldset>
        </SiteSettingsRow>
      </>
    );

    expect(
      html.match(/grid grid-cols-1 gap-x-6 gap-y-2[^"]*lg:grid-cols-3/g)
    ).toHaveLength(4);
    expect(
      html.match(
        /grid w-full min-w-0 items-center lg:col-span-2 lg:min-h-8 lg:max-w-2xl lg:self-start/g
      )
    ).toHaveLength(4);
    expect(
      html.match(/flex items-center text-sm font-medium lg:min-h-8/g)
    ).toHaveLength(4);
    expect(html).not.toContain("lg:pt-1.5");
    expect(html).not.toContain("20rem");
  });

  test("preserves label associations, descriptions, and native field semantics", () => {
    const html = renderToStaticMarkup(
      <SiteSettingsRow
        description="The branch used for production deployments."
        htmlFor="production-branch"
        label="Production branch"
      >
        <input
          aria-describedby="branch-hint"
          autoComplete="off"
          defaultValue="main"
          id="production-branch"
          name="productionBranch"
          required
          type="text"
        />
        <span id="branch-hint">Choose a branch or enter its name.</span>
      </SiteSettingsRow>
    );

    expect(html).toContain('for="production-branch"');
    expect(html).toContain(
      '<p class="text-muted-foreground text-xs text-pretty">The branch used for production deployments.</p>'
    );
    expect(html).toContain('aria-describedby="branch-hint"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('name="productionBranch"');
    expect(html).toContain('required=""');
    expect(html).toContain('type="text"');
    expect(html).toContain('value="main"');
    expect(html).not.toContain("overflow-hidden");
  });

  test("renders a group heading without an unrelated field label", () => {
    const html = renderToStaticMarkup(
      <SiteSettingsRow label="Publishing">
        <fieldset>
          <legend>Publish mode</legend>
          <input name="publishMode" type="radio" />
        </fieldset>
      </SiteSettingsRow>
    );

    expect(html).toContain(
      '<p class="flex items-center text-sm font-medium lg:min-h-8">Publishing</p>'
    );
    expect(html).not.toContain("<label");
    expect(html).toContain("<legend>Publish mode</legend>");
  });
});
