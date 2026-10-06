import type { SiteMdxModule, SlotName } from "../types/site-files";

const chromeModules = import.meta.glob<SiteMdxModule>(
  "@site/{header,footer}.mdx",
  { eager: true }
);
const slotModules = import.meta.glob<SiteMdxModule>("@site/slots/*.mdx", {
  eager: true,
});

function byFileName(
  modules: Record<string, SiteMdxModule>,
  fileName: string
): SiteMdxModule["default"] | undefined {
  const match = Object.entries(modules).find(([path]) =>
    path.endsWith(`/${fileName}`)
  );
  return match?.[1].default;
}

export function chromeComponent(
  name: "header" | "footer"
): SiteMdxModule["default"] | undefined {
  return byFileName(chromeModules, `${name}.mdx`);
}

export function slotComponent(
  name: SlotName
): SiteMdxModule["default"] | undefined {
  return byFileName(slotModules, `${name}.mdx`);
}
