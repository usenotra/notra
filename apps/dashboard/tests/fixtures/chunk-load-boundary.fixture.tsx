import assert from "node:assert/strict";

import { Window } from "happy-dom";
import { Component, act, useEffect, useState } from "react";
import type { ComponentType } from "react";
import { IntlProvider } from "use-intl";

import messages from "../../messages/en.json";
import type {
  ChunkLoadBoundaryProps,
  ChunkLoadBoundaryState,
} from "../../src/types/framework";

const browser = new Window({ url: "http://localhost/" });
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
]) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: Reflect.get(browser, name),
  });
}
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true });

const { createRoot } = await import("react-dom/client");
const { default: dynamic } = await import("../../src/utils/lazy-component");
const ordinaryFailure = process.argv[2] === "ordinary";
const failure = ordinaryFailure
  ? new Error("Unexpected preview state")
  : new TypeError(
      "Failed to fetch dynamically imported module: /assets/old.js"
    );
let finishImport: () => void = () => undefined;
const pending = new Promise<{ default: ComponentType }>((resolve, reject) => {
  finishImport = () => {
    if (ordinaryFailure) {
      resolve({
        default: () => {
          throw failure;
        },
      });
    } else {
      reject(failure);
    }
  };
});
const Preview = dynamic(() => pending);
let composerMounts = 0;
let composerUnmounts = 0;

function Composer() {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    composerMounts += 1;
    return () => {
      composerUnmounts += 1;
    };
  }, []);

  return (
    <div>
      <input
        aria-label="Unsent message"
        onInput={(event) => setDraft(event.currentTarget.value)}
        value={draft}
      />
      <output aria-label="Current draft">{draft}</output>
    </div>
  );
}

class OuterBoundary extends Component<
  ChunkLoadBoundaryProps,
  ChunkLoadBoundaryState
> {
  constructor(props: ChunkLoadBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): ChunkLoadBoundaryState {
    return { error };
  }

  render() {
    return this.state.error instanceof Error ? (
      <p>Outer boundary: {this.state.error.message}</p>
    ) : (
      this.props.children
    );
  }
}

const container = document.createElement("div");
document.body.append(container);
const caughtErrors: unknown[] = [];
const root = createRoot(container, {
  onCaughtError: (error) => caughtErrors.push(error),
});

try {
  await act(async () => {
    root.render(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <OuterBoundary>
          <Preview />
          <Composer />
        </OuterBoundary>
      </IntlProvider>
    );
  });
  const composer = container.querySelector("input");
  assert.ok(composer);
  await act(async () => {
    composer.value = "Keep this unsent message";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
  });
  assert.equal(
    container.querySelector("output")?.textContent,
    "Keep this unsent message"
  );

  await act(async () => {
    finishImport();
  });

  assert.ok(caughtErrors.includes(failure));
  if (ordinaryFailure) {
    assert.equal(
      container.textContent,
      "Outer boundary: Unexpected preview state"
    );
    assert.equal(container.querySelector("[role=alert]"), null);
  } else {
    const fallback = container.querySelector("[role=alert]");
    assert.ok(
      fallback?.textContent?.includes(messages.errors.route.chunkTitle)
    );
    assert.equal(container.querySelector("input"), composer);
    assert.equal(composer.value, "Keep this unsent message");
    assert.equal(
      container.querySelector("output")?.textContent,
      "Keep this unsent message"
    );
    assert.equal(composerMounts, 1);
    assert.equal(composerUnmounts, 0);
    await act(async () => {
      composer.value = "Still editable after the failure";
      composer.dispatchEvent(new Event("input", { bubbles: true }));
    });
    assert.equal(composer.value, "Still editable after the failure");
    assert.equal(
      container.querySelector("output")?.textContent,
      "Still editable after the failure"
    );
  }
} finally {
  await act(async () => root.unmount());
  await browser.happyDOM.close();
}
