import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { MDXComponents } from "mdx/types";

import { getMDXComponents } from "@/../mdx-components";

export function getBlogMDXComponents(): MDXComponents {
  return getMDXComponents({
    pre: ({ children, ...props }) => (
      <div className="code-block">
        <button
          aria-label="Copy code"
          className="code-copy-button"
          data-copy-code
          type="button"
        >
          <HugeiconsIcon className="code-copy-icon" icon={Copy01Icon} />
          <HugeiconsIcon className="code-copy-icon-success" icon={Tick02Icon} />
        </button>
        <pre {...props}>{children}</pre>
      </div>
    ),
  });
}
