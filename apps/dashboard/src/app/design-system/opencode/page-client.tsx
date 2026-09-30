"use client";

import { OpencodeActivity } from "@notra/ui/components/ai-skins/opencode/opencode-activity";
import { OpencodeComposer } from "@notra/ui/components/ai-skins/opencode/opencode-composer";
import { OpencodeLogo } from "@notra/ui/components/ai-skins/opencode/opencode-logo";
import { OpencodeMessage } from "@notra/ui/components/ai-skins/opencode/opencode-message";
import { OpencodeSidebar } from "@notra/ui/components/ai-skins/opencode/opencode-sidebar";
import { OpencodeSources } from "@notra/ui/components/ai-skins/opencode/opencode-sources";
import { OpencodeTurnFooter } from "@notra/ui/components/ai-skins/opencode/opencode-turn-footer";
import { cn } from "@notra/ui/lib/utils";
import type { ReactNode } from "react";

import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";
import {
  OPENCODE_STORY_ACTIVITIES,
  OPENCODE_STORY_SESSION,
  OPENCODE_STORY_SOURCES,
} from "@/constants/design-system-opencode";

function OpencodeSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-opencode-tui-subtle bg-opencode-tui-background text-opencode-tui-foreground w-full overflow-hidden rounded-xl border font-mono text-[13px] leading-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function ChangelogReply() {
  return (
    <>
      <p>
        Drafted <strong>Acme v2.4</strong> from 14 merged PRs, grouped by area
        and written in your brand voice.
      </p>
      <p className="mt-5">
        <strong>Features:</strong>
      </p>
      <p className="mt-5">
        <span className="text-opencode-tui-orange">-</span>{" "}
        <code>apps/scheduler</code> - Scheduled posts now publish on every plan
      </p>
      <p>
        <span className="text-opencode-tui-orange">-</span>{" "}
        <code>apps/geo</code> - Share-of-voice chart per AI engine
      </p>
      <p className="mt-5">
        Saved as a draft in Notra. Run <code>notra_publish_post</code> when
        you&apos;re ready to ship it.
      </p>
    </>
  );
}

export function DesignSystemOpencodeCatalog() {
  const session = OPENCODE_STORY_SESSION;

  return (
    <>
      <section className="scroll-mt-10 space-y-6" id="opencode-session">
        <DesignSystemSectionHeader
          description="Transcript, activity stream, prompt, context, MCP servers and session status in one OpenCode workspace."
          id="opencode-session"
          title="Full session"
        />
        <OpencodeSurface>
          <div className="grid min-h-[36rem] md:grid-cols-[minmax(0,1fr)_minmax(16rem,30%)]">
            <div className="flex min-w-0 flex-col gap-5 px-[2ch] pt-5 pb-2.5">
              <div className="flex flex-1 flex-col gap-5">
                {session.turns.map((turn) => (
                  <div className="flex flex-col gap-5" key={turn.id}>
                    <OpencodeMessage from="user">{turn.prompt}</OpencodeMessage>
                    {turn.activities.map((group) => (
                      <div key={group[0]?.id}>
                        {group.map(({ id, ...activity }) => (
                          <OpencodeActivity key={id} {...activity} />
                        ))}
                      </div>
                    ))}
                    <OpencodeMessage>
                      <ChangelogReply />
                    </OpencodeMessage>
                    <OpencodeTurnFooter
                      agent={session.agent}
                      duration={turn.duration}
                      model={session.model}
                    />
                  </div>
                ))}
              </div>
              <OpencodeComposer
                agent={session.agent}
                context={session.context}
                cwd={session.cwd}
                effort={session.effort}
                model={session.model}
                placeholder=""
                provider={session.provider}
              />
            </div>
            <OpencodeSidebar
              branch={session.branch}
              className="hidden md:flex"
              cwd={session.cwd}
              servers={session.servers}
              spent={session.spent}
              title={session.title}
              tokens={session.tokens}
              used={session.used}
              version={session.version}
            />
          </div>
        </OpencodeSurface>
      </section>

      <section className="scroll-mt-10 space-y-6" id="opencode-home">
        <DesignSystemSectionHeader
          description="The home screen with the block-letter wordmark and the prompt."
          id="opencode-home"
          title="Home"
        />
        <OpencodeSurface>
          <div className="flex min-h-[26rem] flex-col px-[2ch] pt-10 pb-2.5">
            <div className="m-auto flex w-full max-w-xl flex-col gap-10">
              <OpencodeLogo className="mx-auto h-auto max-w-full" scale={1.4} />
              <OpencodeComposer
                agent={session.agent}
                effort={session.effort}
                model={session.model}
                provider={session.provider}
              />
              <p className="text-opencode-tui-muted text-center">
                <span className="text-opencode-tui-orange">● Tip</span> Press{" "}
                <span className="text-opencode-tui-foreground">tab</span> to
                switch between the Build and Plan agents
              </p>
            </div>
            <div className="text-opencode-tui-muted mt-10 flex justify-between gap-[2ch]">
              <span className="truncate">
                {session.cwd}:{session.branch}
              </span>
              <span>{session.version}</span>
            </div>
          </div>
        </OpencodeSurface>
      </section>

      <section className="scroll-mt-10 space-y-6" id="opencode-activity">
        <DesignSystemSectionHeader
          description="User and assistant turns, orange thoughts, muted reads and tool calls, web search with cited sources, and the turn footer."
          id="opencode-activity"
          title="Messages & activity"
        />
        <OpencodeSurface className="flex flex-col gap-5 px-[2ch] py-5">
          <OpencodeMessage from="user">
            which changelog tools do AI assistants recommend?
          </OpencodeMessage>
          <div>
            {OPENCODE_STORY_ACTIVITIES.map(({ id, ...activity }) => (
              <OpencodeActivity key={id} {...activity} />
            ))}
          </div>
          <OpencodeActivity kind="thought" pending />
          <OpencodeMessage
            search={
              <OpencodeSources
                queries={["best AI changelog tools 2026"]}
                sources={OPENCODE_STORY_SOURCES}
              />
            }
          >
            <p>
              <strong>Notra</strong> comes up most, next to hand-written{" "}
              <code>CHANGELOG.md</code> files and GitHub releases.
            </p>
          </OpencodeMessage>
          <OpencodeTurnFooter
            agent={session.agent}
            duration="6.3s"
            model={session.model}
          />
        </OpencodeSurface>
      </section>

      <section className="scroll-mt-10 space-y-6" id="opencode-composer">
        <DesignSystemSectionHeader
          description="Prompt with agent, model, provider and effort, over the busy and idle status rows."
          id="opencode-composer"
          title="Composer"
        />
        <OpencodeSurface className="flex flex-col gap-5 px-[2ch] pt-5 pb-2.5">
          <OpencodeComposer
            busy
            context={session.context}
            effort={session.effort}
            model={session.model}
            provider={session.provider}
          />
          <OpencodeComposer
            cwd={session.cwd}
            effort={session.effort}
            model={session.model}
            provider={session.provider}
          />
        </OpencodeSurface>
      </section>

      <section className="scroll-mt-10 space-y-6" id="opencode-sidebar">
        <DesignSystemSectionHeader
          description="Session title, context budget, MCP connectivity, LSP state, working directory and version."
          id="opencode-sidebar"
          title="Sidebar"
        />
        <OpencodeSurface className="max-w-sm">
          <OpencodeSidebar
            branch={session.branch}
            className="min-h-[30rem]"
            cwd={session.cwd}
            servers={session.servers}
            spent={session.spent}
            title={session.title}
            tokens={session.tokens}
            used={session.used}
            version={session.version}
          />
        </OpencodeSurface>
      </section>
    </>
  );
}
