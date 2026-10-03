import { Fragment } from "react";

import { CodexCode, CodexList, CodexTable } from "../components/codex-markdown";
import { CodexMessage } from "../components/codex-message";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexMarkdownExample() {
  const session = CODEX_DEMO_SESSION;

  return (
    <div className="w-full p-6">
      <CodexTerminal title={session.title}>
        <CodexMessage>
          <p>
            Drafted from <CodexCode>git log</CodexCode> and{" "}
            <strong>CHANGELOG.md</strong>:
          </p>
          <CodexList
            items={session.highlights.map((highlight) => (
              <Fragment key={highlight.id}>
                <strong>{highlight.label}</strong> {highlight.text}
              </Fragment>
            ))}
          />
          <CodexTable codeColumns={[0]} {...session.table} />
        </CodexMessage>
      </CodexTerminal>
    </div>
  );
}
