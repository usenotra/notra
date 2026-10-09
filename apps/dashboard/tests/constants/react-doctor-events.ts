export const reactDoctorEventWorker = String.raw`
  import assert from "node:assert/strict";
  import { mock } from "bun:test";
  import { readFileSync } from "node:fs";
  import { dirname, resolve } from "node:path";
  import * as react from "react";
  import { ORPCError } from "@orpc/server";

  globalThis.fetch = () => { throw new Error("Unexpected network access"); };
  const [file, component, mode] = process.argv.slice(1);
  const path = resolve("src", file);
  const source = readFileSync(path, "utf8");
  const privateExports = {
    TweetUrlStep: "TweetUrlStep",
    UserMessageEditor: "UserMessageEditor",
    CompetitorSynonymsField: "CompetitorSynonymsField",
    toKnownIntegrationError: "toKnownIntegrationError",
  };
  if (privateExports[component]) {
    Bun.plugin({
      name: "test-private-source-export",
      setup(build) {
        const filename = path.slice(path.lastIndexOf("/") + 1).replace(".", "\\.");
        build.onLoad({ filter: new RegExp(filename + "$") }, () => {
          return {
            contents: source + "\nexport { " + component + " };",
            loader: path.endsWith(".tsx") ? "tsx" : "ts",
          };
        });
      },
    });
  }
  let actions = 0;
  let stateIndex = 0;
  let refIndex = 0;
  const states = [];
  const refs = [];
  const pending = [];
  const layouts = [];
  const notifications = [];
  const stateFixtures = {
    TweetUrlStep: ["https://x.com/fixture/status/1"],
    AddSitemapDialog: ["https://example.com/sitemap.xml", "Fixture"],
    WriteSitemapSection: ["https://example.com/sitemap.xml"],
    UserMessageEditor: ["Changed message"],
    CompetitorSynonymsField: [true, "New synonym"],
    RenameCollectionDialog: ["Renamed collection"],
  };
  const action = () => { actions++; };
  const noop = () => {};
  const t = (key) => key;
  t.rich = (key) => key;
  const chain = new Proxy(function () {}, {
    apply() { return chain; },
    get(_, key) {
      if (key === "then") return undefined;
      if (key === Symbol.iterator) return function* () {};
      return chain;
    },
  });
  mock.module("react", () => ({
    ...react,
    useState(initial) {
      const index = stateIndex++;
      if (index === states.length) {
        states.push(stateFixtures[component]?.[index] ?? (typeof initial === "function" ? initial() : initial));
      }
      return [states[index], (update) => pending.push({ index, update })];
    },
    useRef(initial) {
      const index = refIndex++;
      if (index === refs.length) {
        refs.push({ current: initial === null && mode === "ime" ? { blur: action, focus: noop } : initial });
      }
      return refs[index];
    },
    useReducer(_, initial) {
      return [{ ...initial, regenerateOpen: true, regenerateInstructions: "Fixture instructions", isOpen: true }, noop];
    },
    useCallback: (callback) => callback,
    useMemo: (factory) => factory(),
    useId: () => "fixture-id",
    useEffect: noop,
    useLayoutEffect: (effect) => layouts.push(effect),
  }));
  const queryMutation = {
    isPending: false,
    mutate: action,
    mutateAsync: async () => { action(); return { id: "fixture", content: "Fixture", url: "https://example.com" }; },
  };
  const special = {
    useTranslations: () => t,
    useLocale: () => "en",
    getTranslations: async () => t,
    useReducedMotion: () => true,
    motion: chain,
    m: chain,
    toast: Object.assign(noop, { success: noop, error: noop, loading: noop }),
    useBillingCustomer: () => ({ data: null, check: noop }),
    useSelectedSocialAccount: () => ({ accounts: [], selectedAccount: null, selectAccount: noop }),
    useOutputTypeLabel: () => t,
    useQueryState: () => ["preview", noop],
    useCreateSitemap: () => queryMutation,
    useCreateReference: () => queryMutation,
    useFetchTweet: () => queryMutation,
    useRenameContentCollection: () => queryMutation,
    useUpdateContentCollection: () => queryMutation,
    useMutation: () => queryMutation,
    getRegistrableHost: () => "example.com",
    isUrlWithinBrandHost: () => true,
    normalizeSitemapUrl: (url) => url,
    buildChartCss: () => "",
    resolveColors: () => ({ light: ["#000000"], dark: ["#ffffff"] }),
  };
  for (const match of source.matchAll(/import\s+(?!type\s)([\s\S]*?)\s+from\s+["']([^"']+)["'];/g)) {
    const [, bindings, specifier] = match;
    if (specifier === "react" || specifier === "@orpc/server" || specifier === "../utils/errors") continue;
    let target = specifier;
    if (specifier.startsWith("@/")) target = Bun.resolveSync(resolve("src", specifier.slice(2)), dirname(path));
    else if (specifier.startsWith(".")) target = Bun.resolveSync(specifier, dirname(path));
    const exports = {};
    if (bindings.startsWith("* as")) {
      exports.use = noop;
      exports.init = noop;
    } else {
      const names = bindings.replace(/[{}]/g, "").split(",").map((name) => name.trim()).filter(Boolean);
      if (!bindings.startsWith("{")) {
        exports.default = chain;
        names.shift();
      }
      for (const binding of names) {
        if (binding.startsWith("type ")) continue;
        const name = binding.split(/\s+as\s+/)[0];
        exports[name] = special[name] ?? (name.endsWith("Error") ? class FixtureDomainError extends Error {} : chain);
      }
    }
    mock.module(target, () => exports);
  }
  const module = await import(path);
  const render = (props) => {
    stateIndex = 0;
    refIndex = 0;
    layouts.length = 0;
    const tree = module[component](props);
    for (const effect of layouts) effect();
    return tree;
  };
  const find = (node, property, found = []) => {
    if (!node || typeof node !== "object") return found;
    if (typeof node.props?.[property] === "function") found.push(node.props[property]);
    for (const value of Object.values(node.props ?? node)) {
      if (Array.isArray(value)) for (const child of value) find(child, property, found);
      else if (value && typeof value === "object") find(value, property, found);
    }
    return found;
  };
  if (mode === "ime") {
    const props = {
      organizationId: "fixture-org", voiceId: "fixture-voice", voiceWebsiteUrl: "https://example.com",
      open: true, onOpenChange: action, onClose: action, onBack: noop,
      brandVoiceId: "fixture-voice", brandIdentityHref: "/fixture", sitemaps: [], isPending: false, onSelect: action,
      initialText: "Original message", onCancel: action, onSubmit: action,
      id: "fixture-input", synonyms: [], onChange: action,
      collection: { id: "fixture-collection", name: "Original collection" },
      collectionId: "fixture-collection", currentName: "Original collection",
      state: "draft", title: "Fixture", markdown: "Fixture", onRegenerate: action,
      content: { id: "fixture-content", markdown: "Fixture", title: "Fixture" },
      actions: { setEditingTitle: action }, organization: { name: "Fixture" },
      groups: [{ id: "fixture-group", items: [{ id: "general", label: "General" }, { id: "billing", label: "Billing" }] }],
      activeSection: "general", query: "general", onQueryChange: action, searchInputId: "fixture-search",
    };
    if (component.endsWith("Editor") && component !== "UserMessageEditor") {
      props.state = { editingTitle: "Fixture", serverTitle: "Fixture", editedMarkdown: "Fixture" };
    }
    const handlers = find(render(props), "onKeyDown");
    assert.equal(handlers.length, component === "AddSitemapDialog" ? 2 : 1, component);
    for (const handler of handlers) {
      for (const nativeEvent of [{ isComposing: true, keyCode: 13 }, { isComposing: false, keyCode: 229 }]) {
        actions = 0;
        let prevented = 0;
        await handler({ key: "Enter", shiftKey: false, nativeEvent, preventDefault() { prevented++; }, stopPropagation: noop });
        await Promise.resolve();
        assert.equal(actions, 0, component + " must not act during composition");
        assert.equal(prevented, 0, component + " must not prevent composition confirmation");
      }
      actions = 0;
      let prevented = 0;
      await handler({ key: "Enter", shiftKey: false, nativeEvent: { isComposing: false, keyCode: 13 }, preventDefault() { prevented++; }, stopPropagation: noop });
      await Promise.resolve();
      assert.ok(actions > 0 || prevented > 0, component + " ordinary Enter remains active");
      if (component === "UserMessageEditor") {
        actions = 0;
        await handler({ key: "Enter", shiftKey: true, nativeEvent: {}, preventDefault: action, stopPropagation: noop });
        assert.equal(actions, 0, "Shift+Enter remains a newline");
      }
      if (["UserMessageEditor", "TwitterEditor", "LinkedInEditor", "CompetitorSynonymsField", "SettingsModalNav"].includes(component)) {
        actions = 0;
        pending.length = 0;
        await handler({ key: "Escape", nativeEvent: {}, preventDefault: noop, stopPropagation: noop });
        assert.ok(actions > 0 || pending.length > 0, component + " Escape remains active");
      }
      if (component === "SettingsModalNav") {
        for (const key of ["ArrowDown", "ArrowUp"]) {
          pending.length = 0;
          await handler({ key, nativeEvent: {}, preventDefault: noop, stopPropagation: noop });
          assert.deepEqual(pending.at(-1).update, { query: "general", index: 1 }, key + " navigation remains active");
        }
      }
    }
  } else if (mode === "chart") {
    const props = { data: [], config: {}, xDataKey: "x", defaultSelectedDataKey: "initial", onSelectionChange: (value) => notifications.push(value) };
    const tree = render(props);
    const toggle = find(tree, "onToggle")[0];
    assert.equal(typeof toggle, "function", "real legend event handler exposed");
    toggle("initial");
    toggle("series-a");
    toggle("series-a");
    assert.deepEqual(notifications, [null, "series-a", null], "each event notifies once before state replay, including default and rapid toggles");
    for (const { index, update } of pending.splice(0)) {
      if (typeof update === "function") {
        update(states[index]);
        states[index] = update(states[index]);
      } else states[index] = update;
    }
    assert.deepEqual(notifications, [null, "series-a", null], "replaying queued updates must not notify");
    const nextToggle = find(render(props), "onToggle")[0];
    nextToggle("series-b");
    assert.deepEqual(notifications, [null, "series-a", null, "series-b"]);
  } else {
    for (const code of ["NOT_FOUND", "CONFLICT", "FORBIDDEN", "TOO_MANY_REQUESTS"]) {
      const error = new ORPCError(code, { message: "Fixture", data: { fixture: true } });
      assert.equal(await module.toKnownIntegrationError(error), error, "preserve exact ORPCError " + code);
    }
    assert.equal((await module.toKnownIntegrationError(new Error("Fixture"))).code, "BAD_REQUEST");
  }
  console.log(component + " real-source regression passed");
`;

export const reactDoctorEventCases = [
  [
    "app/(dashboard)/[slug]/brand/identity/components/add-reference-dialog.tsx",
    "TweetUrlStep",
    "ime",
  ],
  [
    "app/(dashboard)/[slug]/brand/identity/components/add-sitemap-dialog.tsx",
    "AddSitemapDialog",
    "ime",
  ],
  [
    "components/geo/writer/write-sitemap-section.tsx",
    "WriteSitemapSection",
    "ime",
  ],
  ["components/ai/linkedin-preview.tsx", "LinkedInPreview", "ime"],
  ["components/ai/twitter-preview.tsx", "TwitterPreview", "ime"],
  ["components/chat/user-message-actions.tsx", "UserMessageEditor", "ime"],
  ["components/content/editors/linkedin-editor.tsx", "LinkedInEditor", "ime"],
  ["components/content/editors/twitter-editor.tsx", "TwitterEditor", "ime"],
  [
    "components/content/group/rename-collection-dialog.tsx",
    "RenameCollectionDialog",
    "ime",
  ],
  ["components/geo/competitor-edit-form.tsx", "CompetitorSynonymsField", "ime"],
  ["components/settings/settings-modal-nav.tsx", "SettingsModalNav", "ime"],
  [
    "components/evilcharts/charts/echarts-bar-chart.tsx",
    "EChartsBarChart",
    "chart",
  ],
  [
    "components/evilcharts/charts/echarts-line-chart.tsx",
    "EChartsLineChart",
    "chart",
  ],
  ["lib/orpc/routers/integrations.ts", "toKnownIntegrationError", "error"],
] satisfies [string, string, string][];
