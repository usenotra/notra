import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Window } from "happy-dom";
import { NextIntlClientProvider } from "next-intl";

if (process.env.NOTRA_TABLE_ROW_CLIENT_TEST !== "1") {
  test("table row pointer and keyboard actions", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_TABLE_ROW_CLIENT_TEST: "1" },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 20_000);
} else {
  const browser = new Window({ url: "http://localhost/" });
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: browser },
    document: { configurable: true, value: browser.document },
    navigator: { configurable: true, value: browser.navigator },
    Element: { configurable: true, value: browser.Element },
    HTMLElement: { configurable: true, value: browser.HTMLElement },
    KeyboardEvent: { configurable: true, value: browser.KeyboardEvent },
  });
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { TableBodyRow } =
    await import("../src/components/motion/table/table-body-row");

  test("a row with a native action still opens from non-interactive cells", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onRowClick = mock();
    const onButtonClick = mock();

    await act(async () => {
      root.render(
        <NextIntlClientProvider
          locale="en"
          messages={{ shared: { table: { selectRow: "Select row {row}" } } }}
        >
          <table>
            <tbody>
              <TableBodyRow
                columns={[
                  {
                    key: "query",
                    header: "Query",
                    cell: () => (
                      <button
                        aria-label="Open search gap"
                        onClick={onButtonClick}
                        type="button"
                      >
                        Query
                      </button>
                    ),
                  },
                  {
                    key: "impressions",
                    header: "Impressions",
                    cell: () => 128,
                  },
                ]}
                entry={{ id: "gap-1", row: { id: "gap-1" } }}
                hasRowMenu={false}
                index={0}
                isLastRow
                isSelected={false}
                onRowClick={onRowClick}
                onToggleRow={() => {}}
                renderRowContextMenu={undefined}
                rowHeight={48}
                rowKeyboardActivation={false}
                rowRef={() => {}}
                rowSizing="content"
                selectable={false}
              />
            </tbody>
          </table>
        </NextIntlClientProvider>
      );
    });

    const row = container.querySelector("tr");
    const button = container.querySelector("button");
    expect(row?.hasAttribute("tabindex")).toBe(false);
    expect(button?.getAttribute("aria-label")).toBe("Open search gap");

    await act(async () => {
      row?.querySelectorAll("td")[1]?.click();
    });
    expect(onRowClick).toHaveBeenCalledTimes(1);

    await act(async () => {
      button?.click();
    });
    expect(onButtonClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledTimes(1);

    await act(async () => {
      row?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Enter" })
      );
    });
    expect(onRowClick).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
    container.remove();
  });
}
