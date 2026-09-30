import { Fragment } from "react";

import { CodexComposer } from "../components/codex-composer";
import { CodexExec } from "../components/codex-exec";
import { CodexExplored } from "../components/codex-explored";
import { CodexHeader } from "../components/codex-header";
import { CodexList, CodexTable } from "../components/codex-markdown";
import { CodexMessage } from "../components/codex-message";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexDemo() {
  const session = CODEX_DEMO_SESSION;

  return (
    <div className="w-full min-w-0">
      <CodexTerminal
        className="h-170"
        footer={
          <CodexComposer
            cwd={session.header.cwd}
            effort={session.composer.effort}
            model={session.composer.model}
            placeholder={session.composer.placeholder}
            task={session.composer.task}
            warnings={session.composer.warnings}
          />
        }
        title={session.title}
      >
        <CodexHeader {...session.header} />
        <CodexMessage from="user">{session.userMessage}</CodexMessage>
        <CodexMessage>{session.intro}</CodexMessage>
        <CodexExec {...session.exec} />
        <CodexExplored
          details={session.exploredDetails}
          items={session.explored}
        />
        <CodexMessage>
          <p>{session.summary}</p>
          <CodexList
            items={session.highlights.map((highlight) => (
              <Fragment key={highlight.id}>
                <strong>{highlight.label}</strong> {highlight.text}
              </Fragment>
            ))}
          />
          <p>{session.tableIntro}</p>
          <CodexTable codeColumns={[0]} {...session.table} />
          <p>{session.followUp}</p>
        </CodexMessage>
      </CodexTerminal>
    </div>
  );
}
