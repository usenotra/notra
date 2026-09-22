import { expect, mock, test } from "bun:test";

import type { Sheet } from "@notra/ui/components/ui/sheet";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const back = mock();
const root = mock((_props: ComponentProps<typeof Sheet>) => null);
mock.module("next/navigation", () => ({ useRouter: () => ({ back }) }));
mock.module("@notra/ui/components/ui/sheet", () => ({
  Sheet: root,
  SheetContent: () => null,
  SheetDescription: () => null,
  SheetHeader: () => null,
  SheetTitle: () => null,
}));

const { CompetitorModal } =
  await import("../../src/components/geo/competitor-modal");

test("opening completion and dismissal do not navigate; closing completion does", () => {
  renderToStaticMarkup(
    <CompetitorModal title="Example competitor">Details</CompetitorModal>
  );
  const props = root.mock.calls[0]?.[0];
  if (!props) {
    throw new Error("Sheet was not rendered");
  }
  expect(props.open).toBe(true);
  props.onOpenChangeComplete?.(true);
  // React's state setter ignores the event-details argument.
  (props.onOpenChange as (open: boolean) => void)(false);
  expect(back).not.toHaveBeenCalled();
  props.onOpenChangeComplete?.(false);
  expect(back).toHaveBeenCalledTimes(1);
});
