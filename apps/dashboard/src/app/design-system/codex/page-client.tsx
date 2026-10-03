"use client";

import { CodexComposer } from "@notra/ui/components/ai-skins/codex/codex-composer";
import { CodexExec } from "@notra/ui/components/ai-skins/codex/codex-exec";
import { CodexExplored } from "@notra/ui/components/ai-skins/codex/codex-explored";
import { CodexHeader } from "@notra/ui/components/ai-skins/codex/codex-header";
import {
  CodexList,
  CodexTable,
} from "@notra/ui/components/ai-skins/codex/codex-markdown";
import { CodexMessage } from "@notra/ui/components/ai-skins/codex/codex-message";
import { CodexWorking } from "@notra/ui/components/ai-skins/codex/codex-working";
import { CODEX_COLORS } from "@notra/ui/constants/codex-skin";
import { cn } from "@notra/ui/lib/utils";
import { Fragment, type ReactNode } from "react";

import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";
import {
  CODEX_STORY_EXECS,
  CODEX_STORY_SESSION,
} from "@/constants/design-system-codex";

function CodexTerminal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-[17px] overflow-clip rounded-xl py-4",
        className
      )}
      style={{ backgroundColor: CODEX_COLORS.background }}
    >
      {children}
    </div>
  );
}

function CodexAnswer() {
  const session = CODEX_STORY_SESSION;

  return (
    <CodexMessage>
      <div className="flex flex-col gap-[1.3em]">
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
      </div>
    </CodexMessage>
  );
}

export function DesignSystemCodexCatalog() {
  const session = CODEX_STORY_SESSION;

  return (
    <>
      <section className="scroll-mt-10 space-y-6" id="codex-session">
        <DesignSystemSectionHeader
          description="Header, turns, exec and explored cells, markdown answer, and the composer in one Codex session."
          id="codex-session"
          title="Full session"
        />
        <CodexTerminal className="pb-2">
          <CodexHeader {...session.header} />
          <CodexMessage from="user">{session.userMessage}</CodexMessage>
          <CodexMessage>{session.intro}</CodexMessage>
          <CodexExec {...session.exec} />
          <CodexExplored items={session.explored} />
          <CodexAnswer />
          <CodexComposer
            className="mt-2"
            cwd={session.header.cwd}
            effort={session.composer.effort}
            model={session.composer.model}
            placeholder={session.composer.placeholder}
            task={session.composer.task}
            warnings={session.composer.warnings}
          />
        </CodexTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="codex-header">
        <DesignSystemSectionHeader
          description="Product banner, working directory, and greeting."
          id="codex-header"
          title="Header"
        />
        <CodexTerminal>
          <CodexHeader {...session.header} />
        </CodexTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="codex-messages">
        <DesignSystemSectionHeader
          description="User turns sit on a full-width band. Assistant turns start with a dim bullet."
          id="codex-messages"
          title="Messages"
        />
        <CodexTerminal>
          <CodexMessage from="user">{session.userMessage}</CodexMessage>
          <CodexMessage>{session.intro}</CodexMessage>
        </CodexTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="codex-exec">
        <DesignSystemSectionHeader
          description="Ran, running, and failed commands with shell colors and folded output. Explored groups read and search calls."
          id="codex-exec"
          title="Exec and explored"
        />
        <CodexTerminal>
          {CODEX_STORY_EXECS.map((exec) => (
            <CodexExec key={exec.id} {...exec} />
          ))}
          <CodexExplored items={session.explored} />
          <CodexExplored
            active
            items={session.explored.slice(0, 1)}
            showDetails={false}
          />
          <CodexWorking elapsed={session.elapsed} />
        </CodexTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="codex-composer">
        <DesignSystemSectionHeader
          description="Prompt band with the block cursor, then model, directory, and shortcut hints."
          id="codex-composer"
          title="Composer"
        />
        <CodexTerminal>
          <CodexComposer
            cwd={session.header.cwd}
            effort={session.composer.effort}
            model={session.composer.model}
            placeholder={session.composer.placeholder}
            task={session.composer.task}
            warnings={session.composer.warnings}
          />
        </CodexTerminal>
      </section>
    </>
  );
}
