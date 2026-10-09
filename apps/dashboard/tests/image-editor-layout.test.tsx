import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import { ImageEditor } from "@/components/content/editors/image-editor";

import messages from "../messages/en.json";

test.each([
  { format: "diagram", image: "https://assets.example.test/diagram.png" },
  { format: "diagram", image: "" },
  { format: "marketing", image: "https://assets.example.test/image.png" },
])(
  "$format preview with image '$image' preserves the intended layout",
  ({ format, image }) => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages}>
        <ImageEditor
          content={{
            id: "test-image",
            title: "A diagram title",
            slug: null,
            content: image,
            htmlUrl: null,
            markdown: null,
            rawHtml: null,
            contentType: "image",
            date: "2026-10-09",
            status: "draft",
            sourceMetadata: { format },
          }}
        />
      </IntlProvider>
    );
    expect(html).toContain("A diagram title");
    if (format === "diagram") {
      expect(html).toContain("<h1");
      expect(html).not.toContain("border-shell-border");
      expect(html).not.toContain("shadow-lift");
    } else {
      expect(html).toContain("border-shell-border");
    }
    if (image) {
      expect(html).toContain(`src="${image}"`);
      expect(html).toContain('alt="A diagram title"');
    } else {
      expect(html).toContain(messages.content.editors.imageUnavailable);
    }
  }
);
