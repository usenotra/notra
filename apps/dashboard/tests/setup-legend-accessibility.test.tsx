import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { ComponentProps, PropsWithChildren, SetStateAction } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { setupControls } from "./utils/setup-accessibility";

if (!process.env.NOTRA_SETUP_LEGEND_TEST_WORKER) {
  test("setup and legend accessibility regressions run in isolation", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_SETUP_LEGEND_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const react = await import("react");
  let completed = new Set<number>();
  mock.module("react", () => ({
    ...react,
    useState: () => [
      completed,
      (update: SetStateAction<Set<number>>) => {
        completed = typeof update === "function" ? update(completed) : update;
      },
    ],
  }));
  mock.module("use-intl", () => ({
    useTranslations: (namespace: string) => (key: string) =>
      `${namespace}.${key}`,
  }));
  mock.module("@tanstack/react-router", () => ({
    useLocation: () => ({
      pathname: "/acme/integrations",
      search: {},
      hash: "",
    }),
    Link: ({
      to,
      children,
      className,
    }: ComponentProps<"a"> & { to: string }) => (
      <a className={className} href={to}>
        {children}
      </a>
    ),
  }));
  const dialogPart = ({ children }: PropsWithChildren) => <div>{children}</div>;
  mock.module("@notra/ui/components/shared/responsive-dialog", () => ({
    ResponsiveDialog: dialogPart,
    ResponsiveDialogClose: dialogPart,
    ResponsiveDialogContent: dialogPart,
    ResponsiveDialogDescription: dialogPart,
    ResponsiveDialogFooter: dialogPart,
    ResponsiveDialogHeader: dialogPart,
    ResponsiveDialogTitle: dialogPart,
  }));
  mock.module("../src/components/button", () => ({
    Button: ({ children }: PropsWithChildren) => (
      <button type="button">{children}</button>
    ),
  }));

  const { default: FramerPage } =
    await import("../src/app/(dashboard)/[slug]/integrations/framer/page-client");
  const { default: RaycastPage } =
    await import("../src/app/(dashboard)/[slug]/integrations/raycast/page-client");
  const { FramerSetupGuideDialog } =
    await import("../src/components/integrations/framer-setup-guide-dialog");
  const { RaycastSetupGuideDialog } =
    await import("../src/components/integrations/raycast-setup-guide-dialog");
  const { LegendOverlay } =
    await import("../src/components/evilcharts/ui/echarts-legend");

  Object.entries({
    FramerPage,
    RaycastPage,
    FramerSetupGuideDialog,
    RaycastSetupGuideDialog,
  }).forEach(([name, Component]) => {
    test(`${name} keeps navigation separate from native step activation`, () => {
      completed = new Set();
      const props = {
        organizationSlug: "acme",
        open: true,
        onOpenChange: () => {},
      };
      const tree = Component(props);
      const markup = renderToStaticMarkup(tree);
      const buttons = setupControls(tree, "button");
      expect(buttons).toHaveLength(4);
      expect(markup.match(/<a\b/g)).toHaveLength(2);
      for (const button of buttons) {
        expect(button.props.type).toBe("button");
        expect(button.props["aria-pressed"]).toBe(false);
        expect(button.props.tabIndex).not.toBe(-1);
        expect(renderToStaticMarkup(button)).not.toContain("<a ");
        expect(button.props.className).toContain("flex w-full gap-3 text-left");
      }
      expect(markup).toContain('href="/acme/api-keys"');
      expect(markup).toContain('rel="noopener noreferrer"');
      expect(markup).toContain('target="_blank"');
      expect(markup.match(/ms-9 mt-1.5/g)).toHaveLength(2);
      for (const row of setupControls(tree, "div")) {
        expect(row.props.onClick).toBeUndefined();
      }
      for (const link of setupControls(tree, "a")) {
        expect(link.props.onClick).toBeUndefined();
      }
      expect(completed.size).toBe(0);
      buttons[0]?.props.onClick?.();
      expect([...completed]).toEqual([0]);
      expect(renderToStaticMarkup(Component(props))).toContain(
        "border-primary bg-primary"
      );
      expect(
        setupControls(Component(props), "button")[0]?.props["aria-pressed"]
      ).toBe(true);
      buttons[0]?.props.onClick?.();
      expect(completed.size).toBe(0);
    });
  });

  test("clickable legend entries are native toggle buttons, independent of hover dimming", () => {
    const onToggle = mock((key: string) => key);
    const props = {
      seriesKeys: ["one", "two"],
      config: { one: { label: "One" }, two: { label: "Two" } },
      variant: "square",
      align: "center",
      verticalAlign: "bottom",
      selectedKey: null,
      hoveredKey: "two",
      isClickable: true,
      onToggle,
      style: {},
    } satisfies ComponentProps<typeof LegendOverlay>;
    const tree = LegendOverlay(props);
    const buttons = setupControls(tree, "button");
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.props.type).toBe("button");
      expect(button.props.tabIndex).not.toBe(-1);
      expect(button.props["aria-pressed"]).toBe(false);
      button.props.onClick?.();
    }
    expect(onToggle.mock.calls).toEqual([["one"], ["two"]]);
    const selected = setupControls(
      LegendOverlay({ ...props, selectedKey: "one" }),
      "button"
    );
    expect(selected.map((button) => button.props["aria-pressed"])).toEqual([
      true,
      false,
    ]);
    const inert = LegendOverlay({ ...props, isClickable: false });
    expect(setupControls(inert, "button")).toHaveLength(0);
    for (const entry of setupControls(inert, "div")) {
      expect(entry.props.onClick).toBeUndefined();
      expect(entry.props["aria-pressed"]).toBeUndefined();
    }
    expect(renderToStaticMarkup(inert)).toContain("opacity-30");
  });
}
