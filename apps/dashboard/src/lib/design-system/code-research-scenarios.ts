import {
  CODE_RESEARCH_DEMO_BOX_TTL_MINUTES,
  CODE_RESEARCH_DEMO_INTEGRATION_ID,
  CODE_RESEARCH_DEMO_REPOSITORY,
  CODE_RESEARCH_DEMO_REUSE_MARGIN_MINUTES,
  CODE_RESEARCH_MEASURED_MS,
  CODE_RESEARCH_PLAYBACK_DELAYS,
  CODE_RESEARCH_REAL_TO_PLAYBACK_RATIO,
} from "@/constants/design-system-code-research";
import type {
  CodeResearchAgent,
  CodeResearchExplanation,
  CodeResearchScenario,
  CodeResearchStageId,
  CodeResearchStep,
  CodeResearchToolCall,
} from "@/types/design-system/code-research";

const PR_HEAD_SHA = "a8ef393bfc897ff92f56fead6e411ef8a0ba4acd";
const PR_1292_HEAD_SHA = "8a731531ee9ed309b47c448056f7475d39342a87";
const FIRST_BOX_ID = "distinct-tapir-31166";
const SECOND_BOX_ID = "thorough-kite-48583";

function toPlaybackMs(realMs: number): number {
  return Math.min(
    CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMax,
    Math.max(
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin,
      Math.round(realMs * CODE_RESEARCH_REAL_TO_PLAYBACK_RATIO)
    )
  );
}

function userMessage(messageId: string, text: string): CodeResearchStep {
  return {
    delayMs: CODE_RESEARCH_PLAYBACK_DELAYS.user,
    chat: { kind: "user", messageId, text },
    log: { agent: "notra", label: "Neue Nachricht im Chat" },
  };
}

function assistantStart(
  messageId: string,
  explain?: CodeResearchExplanation
): CodeResearchStep {
  return {
    delayMs: CODE_RESEARCH_PLAYBACK_DELAYS.assistantStart,
    chat: { kind: "assistant-start", messageId },
    explain,
  };
}

function assistantText(
  text: string,
  explain?: CodeResearchExplanation
): CodeResearchStep {
  return {
    delayMs: CODE_RESEARCH_PLAYBACK_DELAYS.text,
    chat: { kind: "text", text },
    explain,
  };
}

function assistantEnd(explain?: CodeResearchExplanation): CodeResearchStep {
  return {
    delayMs: CODE_RESEARCH_PLAYBACK_DELAYS.text,
    chat: { kind: "assistant-end" },
    explain,
  };
}

function divider(
  id: string,
  label: string,
  explain: CodeResearchExplanation,
  sandbox?: CodeResearchStep["sandbox"]
): CodeResearchStep {
  return {
    delayMs: CODE_RESEARCH_PLAYBACK_DELAYS.divider,
    chat: { kind: "divider", id, label },
    explain,
    sandbox,
  };
}

function toolStart(call: CodeResearchToolCall): CodeResearchStep {
  return {
    delayMs: CODE_RESEARCH_PLAYBACK_DELAYS.toolStart,
    chat: {
      kind: "tool-start",
      toolCallId: call.id,
      toolName: call.toolName,
      input: call.input,
      agent: call.agent,
    },
    log: { agent: call.agent, label: `${call.toolName} gestartet` },
    explain: call.explainStart,
    sandbox: call.sandboxStart,
  };
}

function toolEnd(
  call: CodeResearchToolCall,
  delayMs?: number
): CodeResearchStep {
  return {
    delayMs: delayMs ?? toPlaybackMs(call.realMs),
    chat: {
      kind: "tool-end",
      toolCallId: call.id,
      output: call.output,
      errorText: call.errorText,
    },
    log: {
      agent: call.agent,
      label: call.errorText
        ? `${call.toolName} fehlgeschlagen`
        : `${call.toolName} fertig`,
      detail: call.logDetail,
      realMs: call.realMs,
    },
    explain: call.explainEnd,
    sandbox: call.sandboxEnd,
  };
}

function tool(call: CodeResearchToolCall): CodeResearchStep[] {
  return [toolStart(call), toolEnd(call)];
}

function stage(
  id: CodeResearchStageId,
  realMs: number,
  label: string,
  extra?: Omit<NonNullable<CodeResearchStep["sandbox"]>, "stages" | "stageMs">,
  explain?: CodeResearchExplanation
): CodeResearchStep[] {
  return [
    {
      delayMs: CODE_RESEARCH_PLAYBACK_DELAYS.stage,
      sandbox: { stages: { [id]: "running" } },
    },
    {
      delayMs: toPlaybackMs(realMs),
      sandbox: {
        ...extra,
        stages: { [id]: "done" },
        stageMs: { [id]: realMs },
      },
      log: { agent: "platform", label, realMs },
      explain,
    },
  ];
}

function skipStages(ids: CodeResearchStageId[]): CodeResearchStep {
  return {
    delayMs: 0,
    sandbox: {
      stages: Object.fromEntries(ids.map((id) => [id, "skipped"])),
    },
  };
}

function expiresLabel(minutesLeft: number) {
  return `noch ${String(minutesLeft)} min (TTL ${String(CODE_RESEARCH_DEMO_BOX_TTL_MINUTES)} min)`;
}

function repositoryOverview(checkedOut: string, headSha: string) {
  return {
    repository: CODE_RESEARCH_DEMO_REPOSITORY,
    checkedOut,
    headSha,
    defaultBranch: "main",
    head: {
      sha: headSha,
      author: "janburzinski",
      date: "2026-09-28T05:05:31+00:00",
      subject: "fix(dashboard): refresh the skill tooltip with the list",
    },
    topLevel: [".github/", "apps/", "packages/", "README.md", "package.json"],
    readme: {
      path: "README.md",
      excerpt:
        "Notra is a modern GEO tool that asks ChatGPT, Claude and Gemini the questions your buyers ask…",
    },
    manifests: [
      "apps/agent/package.json",
      "apps/dashboard/package.json",
      "packages/ai/package.json",
    ],
    recentCommits: [
      {
        sha: headSha,
        subject: "fix(dashboard): refresh the skill tooltip with the list",
      },
      {
        sha: "5e29741c5",
        subject: "style(dashboard): tighten the AI traffic hero (#1280)",
      },
    ],
  };
}

const RESEARCH_BRIEF = {
  status: "found",
  feature: "Schnellerer Skills-Tab mit Kartenansicht",
  summary:
    "Der Skills-Tab lädt Liste und Detailseite jetzt vorab auf dem Server, dadurch sind die Skills beim Öffnen sofort da. Statt einer Tabelle gibt es eine Kartenansicht mit Sortierung nach Name, Typ oder letzter Änderung.",
  userFacingBehavior: [
    "Liste und Detailseite erscheinen ohne Ladeflackern",
    "Skills werden als Karten mit Typ-Badge und relativer Zeit angezeigt",
    "Sortierung über einen Umschalter statt Tabellenköpfe",
    "Suche findet auch den Anzeigenamen, zum Beispiel 'blog post'",
    "Bei Fehlern gibt es eine Meldung mit Retry-Button",
  ],
  howToUse: [
    { kind: "ui", detail: "Dashboard-Seitenleiste, dann Skills" },
    {
      kind: "ui",
      detail: "Sortier-Umschalter oben rechts: Name, Typ, Aktualisiert",
    },
  ],
  codeExamples: [],
  limitations: [],
  sources: [
    {
      path: "apps/dashboard/src/app/(dashboard)/[slug]/skills/page-client.tsx",
      sha: PR_HEAD_SHA,
    },
    {
      path: "apps/dashboard/src/app/(dashboard)/[slug]/skills/[name]/page.tsx",
      sha: PR_HEAD_SHA,
    },
  ],
  confidence: "high",
  openQuestions: [],
  reason: null,
};

function researcherCall(
  id: string,
  message: string,
  output: unknown,
  realMs: number
): CodeResearchToolCall {
  return {
    id,
    agent: "notra",
    toolName: "code-researcher",
    input: { message },
    output,
    realMs,
    logDetail: "Background-Task fertig, Briefing geht an Notra",
  };
}

function writerCall(
  id: string,
  message: string,
  output: unknown,
  realMs: number
): CodeResearchToolCall {
  return {
    id,
    agent: "notra",
    toolName: "content-writer",
    input: { message },
    output,
    realMs,
    logDetail: "Background-Task fertig",
  };
}

function freshOpenRepository(params: {
  callId: string;
  pullRequestNumber: number;
  boxId: string;
  headSha: string;
  checkedOut: string;
  expiredBefore?: boolean;
}): CodeResearchStep[] {
  const call: CodeResearchToolCall = {
    id: params.callId,
    agent: "code-researcher",
    toolName: "open_repository",
    input: {
      integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
      pullRequestNumber: params.pullRequestNumber,
    },
    output: repositoryOverview(params.checkedOut, params.headSha),
    realMs:
      CODE_RESEARCH_MEASURED_MS.lookup +
      CODE_RESEARCH_MEASURED_MS.token +
      CODE_RESEARCH_MEASURED_MS.create +
      CODE_RESEARCH_MEASURED_MS.clone +
      CODE_RESEARCH_MEASURED_MS.checkoutPr +
      CODE_RESEARCH_MEASURED_MS.overview,
    logDetail: `Box ${params.boxId} bereit, ${params.checkedOut}`,
    explainStart: {
      title: "Erst jetzt entsteht die Sandbox",
      body: "Bis hierhin gab es keine Box. Sie wird lazy beim ersten Code-Tool erstellt, das eine braucht, hier open_repository. Chats ohne Code-Recherche kosten also keine Box.",
    },
    sandboxStart: { resetStages: true },
    explainEnd: {
      title: "Repo ist ausgecheckt",
      body: "Die Box läuft jetzt offline gegenüber allem außer github.com. Das Token lag nie in der Box: Der Upstash-Proxy hängt es an Requests zu github.com. open_repository liefert dem Researcher direkt einen Überblick, damit er weiß, wo er suchen muss.",
    },
  };

  return [
    toolStart(call),
    ...stage(
      "lookup",
      CODE_RESEARCH_MEASURED_MS.lookup,
      params.expiredBefore
        ? "Redis: Eintrag abgelaufen, also miss"
        : "Redis: miss, noch keine Box für diesen Chat",
      { redis: "miss" },
      {
        title: "Gibt es schon eine Box?",
        body: "Der Schlüssel ist die Root-Session des Chats plus die Integration. Subagents laufen in eigenen Child-Sessions, deshalb zählt die Root-Session. So teilen sich alle Aufrufe in einem Chat eine Box.",
      }
    ),
    ...stage(
      "lease",
      CODE_RESEARCH_MEASURED_MS.lease,
      "Lease gesetzt (SET NX)",
      {
        redis: "lease",
      }
    ),
    skipStages(["attach"]),
    ...stage(
      "token",
      CODE_RESEARCH_MEASURED_MS.token,
      "GitHub-Token: contents read, 1 Repo",
      undefined,
      {
        title: "Minimal-Token",
        body: "Das GitHub-App-Token wird nur mit contents: read und nur für dieses eine Repo erzeugt. Im Live-Test scheiterte ein git push aus der Box mit 403.",
      }
    ),
    ...stage(
      "create",
      CODE_RESEARCH_MEASURED_MS.create,
      `EphemeralBox ${params.boxId} erstellt`,
      {
        phase: "creating",
        boxId: params.boxId,
        expiresLabel: expiresLabel(CODE_RESEARCH_DEMO_BOX_TTL_MINUTES),
      },
      {
        title: "EphemeralBox statt Box",
        body: "Wird ohne Polling in ca. 2 s erstellt und löscht sich nach der TTL von 45 min selbst. Es gibt keinen Aufräum-Cron. Netzwerk: nur github.com, der Rest ist geblockt.",
      }
    ),
    {
      delayMs: 0,
      sandbox: { phase: "cloning" },
    },
    ...stage(
      "clone",
      CODE_RESEARCH_MEASURED_MS.clone,
      "git clone --shallow-since=90.days.ago",
      { execCount: 1 },
      {
        title: "Shallow Clone",
        body: "Nur der Default-Branch mit 90 Tagen History, beim Notra-Repo 776 Commits in 3,4 s. Das reicht für git log, git show und die Diffs der letzten Features.",
      }
    ),
    { delayMs: 0, sandbox: { phase: "checkout" } },
    ...stage(
      "checkout",
      CODE_RESEARCH_MEASURED_MS.checkoutPr,
      `refs/pull/${String(params.pullRequestNumber)}/head ausgecheckt`,
      {
        checkedOut: params.checkedOut,
        headSha: params.headSha,
        execCount: 2,
      }
    ),
    ...stage(
      "store",
      CODE_RESEARCH_MEASURED_MS.store,
      "Status in Redis gespeichert",
      {
        redis: "stored",
        phase: "ready",
      }
    ),
    ...stage(
      "overview",
      CODE_RESEARCH_MEASURED_MS.overview,
      "Überblick gelesen",
      {
        execCount: 3,
      }
    ),
    toolEnd(call, CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin),
  ];
}

function reusedOpenRepository(params: {
  callId: string;
  pullRequestNumber: number;
  headSha: string;
  checkedOut: string;
  execCount: number;
}): CodeResearchStep[] {
  const call: CodeResearchToolCall = {
    id: params.callId,
    agent: "code-researcher",
    toolName: "open_repository",
    input: {
      integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
      pullRequestNumber: params.pullRequestNumber,
    },
    output: repositoryOverview(params.checkedOut, params.headSha),
    realMs:
      CODE_RESEARCH_MEASURED_MS.lookup +
      CODE_RESEARCH_MEASURED_MS.attachFresh +
      CODE_RESEARCH_MEASURED_MS.overview,
    logDetail: "Bestehende Box wiederverwendet",
    explainStart: {
      title: "Selber Chat, selbe Box",
      body: "Der Researcher startet frisch und ruft wieder open_repository auf. Dieses Mal findet der Redis-Lookup die Box aus dem ersten Lauf.",
    },
    sandboxStart: { resetStages: true },
    explainEnd: {
      title: "Kein zweiter Clone",
      body: "Die Box war noch warm. Redis hat den Eintrag geliefert, Box.get + getStatus haben bestätigt, dass sie lebt, und der Ref war schon ausgecheckt. Kosten: ca. 0,5 s statt 7,5 s.",
    },
  };
  return [
    toolStart(call),
    ...stage(
      "lookup",
      CODE_RESEARCH_MEASURED_MS.lookup,
      "Redis: hit, Box aus diesem Chat gefunden",
      { redis: "hit" }
    ),
    skipStages(["lease"]),
    ...stage(
      "attach",
      CODE_RESEARCH_MEASURED_MS.attachFresh,
      "Box.get + getStatus: lebt",
      undefined,
      {
        title: "Reattach statt neu erstellen",
        body: "Tool-Calls laufen in verschiedenen Function-Invocations. Deshalb holt jeder Call die Box per ID und prüft den Status. Wurde dieselbe Box in den letzten 60 s schon geprüft, entfällt auch dieser Roundtrip.",
      }
    ),
    skipStages(["token", "create", "clone", "checkout", "store"]),
    ...stage(
      "overview",
      CODE_RESEARCH_MEASURED_MS.overview,
      "Überblick gelesen",
      { execCount: params.execCount }
    ),
    toolEnd(call, CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin),
  ];
}

function switchedOpenRepository(params: {
  callId: string;
  pullRequestNumber: number;
  headSha: string;
  checkedOut: string;
  execCount: number;
}): CodeResearchStep[] {
  const call: CodeResearchToolCall = {
    id: params.callId,
    agent: "code-researcher",
    toolName: "open_repository",
    input: {
      integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
      pullRequestNumber: params.pullRequestNumber,
    },
    output: repositoryOverview(params.checkedOut, params.headSha),
    realMs:
      CODE_RESEARCH_MEASURED_MS.lookup +
      CODE_RESEARCH_MEASURED_MS.attachFresh +
      CODE_RESEARCH_MEASURED_MS.checkoutPr +
      CODE_RESEARCH_MEASURED_MS.overview,
    logDetail: `Selbe Box, auf ${params.checkedOut} umgeschaltet`,
    explainStart: {
      title: "Anderer PR, selbe Box",
      body: "Pro Chat und Integration gibt es genau eine Box. Ein anderer Ref erzeugt keine neue Box, sondern holt nur den neuen Ref in die bestehende.",
    },
    sandboxStart: { resetStages: true },
    explainEnd: {
      title: "Nur fetch + checkout",
      body: "Der Clone von vorhin bleibt, es wird nur der neue PR-Head nachgeladen. Weil das den Zustand der Box ändert, läuft es unter dem Lease. Parallele Reads sehen danach den neuen HEAD.",
    },
  };
  return [
    toolStart(call),
    ...stage("lookup", CODE_RESEARCH_MEASURED_MS.lookup, "Redis: hit", {
      redis: "hit",
    }),
    ...stage(
      "lease",
      CODE_RESEARCH_MEASURED_MS.lease,
      "Lease gesetzt, Ref wechselt",
      {
        redis: "lease",
      }
    ),
    ...stage(
      "attach",
      CODE_RESEARCH_MEASURED_MS.attachFresh,
      "Box.get + getStatus: lebt"
    ),
    skipStages(["token", "create", "clone"]),
    { delayMs: 0, sandbox: { phase: "checkout" } },
    ...stage(
      "checkout",
      CODE_RESEARCH_MEASURED_MS.checkoutPr,
      `refs/pull/${String(params.pullRequestNumber)}/head ausgecheckt`,
      {
        checkedOut: params.checkedOut,
        headSha: params.headSha,
        execCount: params.execCount - 1,
      }
    ),
    ...stage(
      "store",
      CODE_RESEARCH_MEASURED_MS.store,
      "Neuer Ref in Redis gespeichert",
      {
        redis: "stored",
        phase: "ready",
      }
    ),
    ...stage(
      "overview",
      CODE_RESEARCH_MEASURED_MS.overview,
      "Überblick gelesen",
      {
        execCount: params.execCount,
      }
    ),
    toolEnd(call, CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin),
  ];
}

function execTool(
  agent: CodeResearchAgent,
  call: Omit<CodeResearchToolCall, "agent" | "realMs"> & { realMs?: number },
  execCount: number
): CodeResearchStep[] {
  return tool({
    ...call,
    agent,
    realMs: call.realMs ?? CODE_RESEARCH_MEASURED_MS.exec,
    sandboxEnd: { ...call.sandboxEnd, execCount },
  });
}

function firstRunSteps(): CodeResearchStep[] {
  return [
    userMessage(
      "u1",
      "Wir haben gerade die Performance vom Skills-Tab verbessert (PR #1279). Schreib mir bitte einen kurzen Blogpost dazu, was sich für Nutzer ändert."
    ),
    assistantStart("a1", {
      title: "Root-Agent entscheidet",
      body: "Notra erkennt: Es geht um ein konkretes Feature im eigenen Produkt, und GitHub ist verbunden. Also zuerst code-researcher, dann content-writer. Noch existiert keine Sandbox.",
    }),
    assistantText(
      "Ich schaue mir zuerst im Code an, was sich mit PR #1279 konkret geändert hat."
    ),
    toolStart({
      ...researcherCall(
        "t-researcher-1",
        `Feature: Performance-Verbesserung im Skills-Tab. integrationId: ${CODE_RESEARCH_DEMO_INTEGRATION_ID}. Pull Request: #1279. Fokus: was ändert sich für Nutzer.`,
        RESEARCH_BRIEF,
        CODE_RESEARCH_MEASURED_MS.researcherTotal
      ),
      explainStart: {
        title: "code-researcher läuft als Background-Task",
        body: "eve startet jeden Subagent im Hintergrund. Der Root-Agent wartet, bis das Briefing zurückkommt. Deshalb ist der Researcher ein Geschwister vom Writer und nicht in ihm verschachtelt.",
      },
    }),
    ...tool({
      id: "t-pr-1",
      agent: "code-researcher",
      toolName: "get_pull_requests",
      input: {
        integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
        pull_number: 1279,
      },
      output: {
        number: 1279,
        title: "perf(skills): improve skills tab perf",
        merged: true,
        head: { ref: "perf/skills-tab", sha: PR_HEAD_SHA },
        stats: { changedFiles: 14, additions: 612, deletions: 488 },
      },
      realMs: CODE_RESEARCH_MEASURED_MS.getPullRequest,
      logDetail: "GitHub-REST, noch ohne Sandbox",
      explainEnd: {
        title: "PR-Metadaten kommen noch per API",
        body: "Titel und Stats kommen über die GitHub-REST-API. Der Titel 'improve skills tab perf' sagt aber wenig darüber, was Nutzer davon haben, deshalb geht es jetzt in den Code.",
      },
    }),
    ...freshOpenRepository({
      callId: "t-open-1",
      pullRequestNumber: 1279,
      boxId: FIRST_BOX_ID,
      headSha: PR_HEAD_SHA,
      checkedOut: "pull request #1279",
    }),
    ...execTool(
      "code-researcher",
      {
        id: "t-diff-1",
        toolName: "show_repository_change",
        input: { integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID },
        output: {
          commit: {
            sha: PR_HEAD_SHA,
            subject: "fix(dashboard): refresh the skill tooltip with the list",
          },
          summary:
            "apps/dashboard/src/app/(dashboard)/[slug]/skills/page-client.tsx | 194 ++++----\napps/dashboard/src/app/(dashboard)/[slug]/skills/[name]/page.tsx | 50 +++-\n14 files changed, 612 insertions(+), 488 deletions(-)",
          patch:
            "diff --git a/apps/dashboard/src/app/(dashboard)/[slug]/skills/page-client.tsx …",
          patchTruncated: false,
          hiddenFiles: [],
        },
        realMs: 342,
        logDetail: "Diff gegen den Abzweigpunkt von main, 34 KB",
        explainEnd: {
          title: "Diff ohne ref",
          body: "Ohne ref zeigt show_repository_change alles, was der ausgecheckte PR gegenüber main geändert hat (merge-base). Lockfiles und generierte Dateien fliegen raus, .env-Dateien werden komplett ausgeblendet.",
        },
      },
      4
    ),
    ...execTool(
      "code-researcher",
      {
        id: "t-search-1",
        toolName: "search_repository",
        input: {
          integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
          query: "No skills match your search",
        },
        output: {
          matchCount: 2,
          matches: [
            {
              path: "apps/dashboard/messages/en.json",
              line: 5120,
              text: '"noResults": "No skills match your search"',
            },
          ],
        },
        logDetail: "git grep, 0,2 s",
      },
      5
    ),
    ...execTool(
      "code-researcher",
      {
        id: "t-read-1",
        toolName: "read_repository_file",
        input: {
          integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
          path: "apps/dashboard/src/app/(dashboard)/[slug]/skills/page-client.tsx",
          startLine: 1,
          endLine: 160,
        },
        output: {
          path: "apps/dashboard/src/app/(dashboard)/[slug]/skills/page-client.tsx",
          startLine: 1,
          endLine: 160,
          totalLines: 318,
          hasMore: true,
          content: '"use client";\n\nimport { SkillCard } from …',
        },
        explainEnd: {
          title: "Lesen mit Leitplanken",
          body: "Maximal 400 Zeilen pro Call. Pfade werden gegen das Repo-Root geprüft (kein ../, keine Symlinks nach außen), .env & Co. sind gesperrt, und Secrets im Output werden geschwärzt.",
        },
      },
      6
    ),
    toolEnd(
      {
        ...researcherCall(
          "t-researcher-1",
          "",
          RESEARCH_BRIEF,
          CODE_RESEARCH_MEASURED_MS.researcherTotal
        ),
        explainEnd: {
          title: "Briefing ist zurück, Box bleibt warm",
          body: `Der Researcher gibt ein strukturiertes Briefing zurück, keine Rohdateien. Die Box wird nicht gelöscht: Folgefragen im Chat nutzen sie weiter. Redis vergisst sie ${String(CODE_RESEARCH_DEMO_REUSE_MARGIN_MINUTES)} min vor der TTL, damit nie eine sterbende Box reattached wird.`,
        },
        sandboxEnd: { expiresLabel: expiresLabel(44) },
      },
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin
    ),
    assistantText(
      "Das Briefing ist da. Jetzt schreibt der Content-Writer den Post in eurer Brand-Voice.",
      {
        title: "Übergabe an den Writer",
        body: "Notra gibt das komplette Briefing als JSON in die Nachricht an content-writer. Der Writer selbst hat keine Code-Tools und fasst die Sandbox nie an.",
      }
    ),
    toolStart(
      writerCall(
        "t-writer-1",
        "Content type: blog_post. Sprache: Deutsch. Code research brief: {…}",
        undefined,
        CODE_RESEARCH_MEASURED_MS.writerTotal
      )
    ),
    ...tool({
      id: "t-skills-1",
      agent: "content-writer",
      toolName: "list_available_skills",
      input: {},
      output: { skills: ["blog-post", "changelog", "humanizer"] },
      realMs: 280,
    }),
    ...tool({
      id: "t-skill-1",
      agent: "content-writer",
      toolName: "get_skill_by_name",
      input: { name: "blog-post" },
      output: { name: "blog-post", content: "…" },
      realMs: 140,
    }),
    ...tool({
      id: "t-brand-1",
      agent: "content-writer",
      toolName: "get_brand_references",
      input: {},
      output: { references: 6 },
      realMs: 120,
    }),
    ...tool({
      id: "t-create-1",
      agent: "content-writer",
      toolName: "create_post",
      input: {
        contentType: "blog_post",
        title: "Der Skills-Tab lädt jetzt spürbar schneller",
        markdown:
          "Der Skills-Tab im Dashboard ist schneller und übersichtlicher geworden…",
      },
      output: { postId: "ff60fe63e295d10c", status: "created" },
      realMs: 2900,
      logDetail: "Draft gespeichert",
    }),
    toolEnd(
      {
        ...writerCall(
          "t-writer-1",
          "",
          {
            status: "created",
            posts: [
              {
                postId: "ff60fe63e295d10c",
                title: "Der Skills-Tab lädt jetzt spürbar schneller",
              },
            ],
          },
          CODE_RESEARCH_MEASURED_MS.writerTotal
        ),
      },
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin
    ),
    assistantText(
      "Fertig! Der Entwurf „Der Skills-Tab lädt jetzt spürbar schneller“ liegt in deinen Drafts."
    ),
    assistantEnd({
      title: "Ende des Turns",
      body: "Gesamt ca. 2 Minuten: knapp 1 min Recherche (davon ca. 8 s Box + Clone), gut 1 min Schreiben. Die Box lebt weiter, bis ihre TTL abläuft oder der Chat eine Folgefrage stellt.",
    }),
  ];
}

function instant(steps: CodeResearchStep[]): CodeResearchStep[] {
  return steps.map((step) => ({ ...step, delayMs: 0 }));
}

function followUpSteps(): CodeResearchStep[] {
  return [
    divider(
      "d1",
      "3 Minuten später",
      {
        title: "Folgefrage im selben Chat",
        body: "Die Box aus dem ersten Lauf lebt noch (TTL 45 min). Redis kennt sie unter dem Schlüssel der Root-Session.",
      },
      { expiresLabel: expiresLabel(41) }
    ),
    userMessage(
      "u2",
      "Mach daraus bitte noch einen LinkedIn-Post und erklär kurz, wie man die neue Sortierung benutzt."
    ),
    assistantStart("a2"),
    assistantText("Ich prüfe kurz im Code, wie die Sortierung funktioniert."),
    toolStart(
      researcherCall(
        "t-researcher-2",
        `Feature: Sortierung im Skills-Tab. integrationId: ${CODE_RESEARCH_DEMO_INTEGRATION_ID}. Pull Request: #1279.`,
        { ...RESEARCH_BRIEF, feature: "Sortierung im Skills-Tab" },
        21_000
      )
    ),
    ...reusedOpenRepository({
      callId: "t-open-2",
      pullRequestNumber: 1279,
      headSha: PR_HEAD_SHA,
      checkedOut: "pull request #1279",
      execCount: 7,
    }),
    ...execTool(
      "code-researcher",
      {
        id: "t-search-2",
        toolName: "search_repository",
        input: {
          integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
          query: "SortToggle",
          path: "apps/dashboard/src",
        },
        output: {
          matchCount: 3,
          matches: [
            {
              path: "apps/dashboard/src/components/skills/skills-sort-toggle.tsx",
              line: 12,
              text: "export function SkillsSortToggle({ value, onChange }) {",
            },
          ],
        },
      },
      8
    ),
    ...execTool(
      "code-researcher",
      {
        id: "t-read-2",
        toolName: "read_repository_file",
        input: {
          integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
          path: "apps/dashboard/src/components/skills/skills-sort-toggle.tsx",
        },
        output: { totalLines: 64, content: "…" },
      },
      9
    ),
    toolEnd(
      {
        ...researcherCall(
          "t-researcher-2",
          "",
          { ...RESEARCH_BRIEF, feature: "Sortierung im Skills-Tab" },
          21_000
        ),
        sandboxEnd: { expiresLabel: expiresLabel(40) },
      },
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin
    ),
    toolStart(
      writerCall(
        "t-writer-2",
        "Content type: linkedin_post. Code research brief: {…}",
        undefined,
        38_000
      )
    ),
    ...tool({
      id: "t-create-2",
      agent: "content-writer",
      toolName: "create_post",
      input: {
        contentType: "linkedin_post",
        title: "Skills-Tab: schneller und sortierbar",
      },
      output: { postId: "b71c0e2a91d4f3aa", status: "created" },
      realMs: 2400,
    }),
    toolEnd(
      writerCall(
        "t-writer-2",
        "",
        { status: "created", posts: [{ postId: "b71c0e2a91d4f3aa" }] },
        38_000
      ),
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin
    ),
    assistantText("Der LinkedIn-Post ist als Entwurf gespeichert."),
    assistantEnd({
      title: "Wiederverwendung spart den teuren Teil",
      body: "Zweiter Lauf: keine neue Box, kein Clone. Der Researcher war nach ca. 20 s fertig statt 55 s, weil er den Code schon kannte und die Box warm war.",
    }),
  ];
}

function otherPullRequestSteps(): CodeResearchStep[] {
  return [
    divider("d2", "Kurz danach", {
      title: "Anderer PR im selben Chat",
      body: "Jetzt geht es um PR #1292. Spannend ist, ob eine zweite Box entsteht (nein) oder die bestehende umgeschaltet wird (ja).",
    }),
    userMessage(
      "u3",
      "Schreib noch einen kurzen Changelog-Eintrag zu PR #1292."
    ),
    assistantStart("a3"),
    toolStart(
      researcherCall(
        "t-researcher-3",
        `integrationId: ${CODE_RESEARCH_DEMO_INTEGRATION_ID}. Pull Request: #1292.`,
        { ...RESEARCH_BRIEF, feature: "GPT-6 Sol und unslop fürs Schreiben" },
        18_000
      )
    ),
    ...switchedOpenRepository({
      callId: "t-open-3",
      pullRequestNumber: 1292,
      headSha: PR_1292_HEAD_SHA,
      checkedOut: "pull request #1292",
      execCount: 9,
    }),
    ...execTool(
      "code-researcher",
      {
        id: "t-diff-3",
        toolName: "show_repository_change",
        input: { integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID },
        output: {
          commit: {
            sha: PR_1292_HEAD_SHA,
            subject: "feat(content): use GPT-6 Sol and unslop for writing",
          },
        },
      },
      10
    ),
    toolEnd(
      researcherCall(
        "t-researcher-3",
        "",
        { ...RESEARCH_BRIEF, feature: "GPT-6 Sol und unslop fürs Schreiben" },
        18_000
      ),
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin
    ),
    toolStart(
      writerCall(
        "t-writer-3",
        "Content type: changelog. Code research brief: {…}",
        undefined,
        30_000
      )
    ),
    ...tool({
      id: "t-create-3",
      agent: "content-writer",
      toolName: "create_post",
      input: {
        contentType: "changelog",
        title: "Natürlichere Texte beim Schreiben",
      },
      output: { postId: "0c9e11b2d6aa7f41", status: "created" },
      realMs: 2100,
    }),
    toolEnd(
      writerCall("t-writer-3", "", { status: "created" }, 30_000),
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin
    ),
    assistantText("Der Changelog-Eintrag ist gespeichert."),
    assistantEnd({
      title: "Eine Box pro Chat und Repo",
      body: "Egal wie viele PRs im Chat besprochen werden: Es bleibt eine Box. Ein Ref-Wechsel kostet ca. 1,5 s fetch + checkout statt ca. 6 s für eine neue Box mit Clone.",
    }),
  ];
}

function expiredSteps(): CodeResearchStep[] {
  return [
    divider(
      "d3",
      "50 Minuten später",
      {
        title: "Die Box ist weg",
        body: "Nach 45 min hat Upstash die EphemeralBox selbst gelöscht. Der Redis-Eintrag war schon nach 40 min abgelaufen. Nichts musste aufgeräumt werden.",
      },
      {
        phase: "expired",
        redis: "expired",
        expiresLabel: "abgelaufen",
        resetStages: true,
      }
    ),
    userMessage(
      "u4",
      "Kannst du im Blogpost noch erwähnen, was passiert, wenn das Laden fehlschlägt?"
    ),
    assistantStart("a4"),
    toolStart(
      researcherCall(
        "t-researcher-4",
        `Feature: Fehlerzustand im Skills-Tab. integrationId: ${CODE_RESEARCH_DEMO_INTEGRATION_ID}. Pull Request: #1279.`,
        RESEARCH_BRIEF,
        24_000
      )
    ),
    ...freshOpenRepository({
      callId: "t-open-4",
      pullRequestNumber: 1279,
      boxId: SECOND_BOX_ID,
      headSha: PR_HEAD_SHA,
      checkedOut: "pull request #1279",
      expiredBefore: true,
    }),
    ...execTool(
      "code-researcher",
      {
        id: "t-search-4",
        toolName: "search_repository",
        input: {
          integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
          query: "Retry",
          path: "apps/dashboard/src/app/(dashboard)/[slug]/skills",
        },
        output: { matchCount: 2 },
      },
      4
    ),
    toolEnd(
      researcherCall("t-researcher-4", "", RESEARCH_BRIEF, 24_000),
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin
    ),
    assistantText("Ich habe den Abschnitt zum Fehlerfall ergänzt."),
    assistantEnd({
      title: "Transparent neu aufgebaut",
      body: "Aus Sicht des Modells ist nichts passiert: open_repository hat einfach eine neue Box erstellt und wieder geclont. Stirbt eine Box mitten in einem Tool-Call, bekommt das Modell die Meldung 'Sandbox expired, call open_repository again'.",
    }),
  ];
}

function disabledSteps(): CodeResearchStep[] {
  return [
    {
      delayMs: 0,
      sandbox: { phase: "disabled", redis: "empty" },
      explain: {
        title: "Code-Recherche ist aus",
        body: "Das Databuddy-Flag content-code-research ist für diese Org aus, oder NOTRA_CODE_RESEARCH=off ist gesetzt. Das Dashboard schickt dann x-notra-code-research: false.",
      },
    },
    userMessage(
      "u1",
      "Wir haben gerade die Performance vom Skills-Tab verbessert (PR #1279). Schreib mir bitte einen kurzen Blogpost dazu."
    ),
    assistantStart("a1"),
    toolStart(
      researcherCall(
        "t-researcher-off",
        `Feature: Skills-Tab. integrationId: ${CODE_RESEARCH_DEMO_INTEGRATION_ID}. Pull Request: #1279.`,
        {
          status: "unavailable",
          reason: "Code research is not enabled for this organization.",
        },
        4200
      )
    ),
    ...tool({
      id: "t-open-off",
      agent: "code-researcher",
      toolName: "open_repository",
      input: {
        integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
        pullRequestNumber: 1279,
      },
      errorText:
        "Code research is not enabled for this organization. Finish with status unavailable.",
      realMs: 3,
      explainEnd: {
        title: "Fail closed, ohne Box",
        body: "Das Tool prüft das Session-Attribut, bevor irgendetwas passiert. Es gibt keinen Redis-Lookup, kein Token und keine Box. Der Researcher meldet 'unavailable'.",
      },
    }),
    toolEnd(
      researcherCall(
        "t-researcher-off",
        "",
        {
          status: "unavailable",
          reason: "Code research is not enabled for this organization.",
        },
        4200
      ),
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin
    ),
    toolStart(
      writerCall(
        "t-writer-off",
        "Content type: blog_post. Kein Code-Briefing.",
        undefined,
        52_000
      )
    ),
    ...tool({
      id: "t-pr-off",
      agent: "content-writer",
      toolName: "get_pull_requests",
      input: {
        integrationId: CODE_RESEARCH_DEMO_INTEGRATION_ID,
        pull_number: 1279,
      },
      output: { title: "perf(skills): improve skills tab perf" },
      realMs: 380,
    }),
    ...tool({
      id: "t-create-off",
      agent: "content-writer",
      toolName: "create_post",
      input: {
        contentType: "blog_post",
        title: "Verbesserungen im Skills-Tab",
      },
      output: { postId: "4d2a…", status: "created" },
      realMs: 2600,
    }),
    toolEnd(
      writerCall("t-writer-off", "", { status: "created" }, 52_000),
      CODE_RESEARCH_PLAYBACK_DELAYS.toolEndMin
    ),
    assistantText("Der Entwurf ist gespeichert."),
    assistantEnd({
      title: "Fallback wie heute",
      body: "Ohne Briefing schreibt der Writer nur aus PR-Titel und Commits, genau wie vor diesem Feature. Der Post wird entsprechend vager.",
    }),
  ];
}

function withHistory(
  history: CodeResearchStep[],
  steps: CodeResearchStep[]
): { steps: CodeResearchStep[]; startAt: number } {
  return { steps: [...instant(history), ...steps], startAt: history.length };
}

export function buildCodeResearchScenarios(): CodeResearchScenario[] {
  const firstRun = firstRunSteps();
  const followUp = withHistory(firstRun, followUpSteps());
  const otherPullRequest = withHistory(firstRun, otherPullRequestSteps());
  const expired = withHistory(firstRun, expiredSteps());

  return [
    {
      id: "first-run",
      label: "Erster Lauf",
      description:
        "Neuer Chat, Blogpost zu PR #1279. Hier entsteht die erste Box.",
      steps: firstRun,
      startAt: 0,
    },
    {
      id: "follow-up",
      label: "Folgefrage",
      description:
        "Selber Chat, die Box ist noch warm und wird wiederverwendet.",
      ...followUp,
    },
    {
      id: "other-pr",
      label: "Anderer PR",
      description: "Selber Chat, anderer PR: selbe Box, nur neuer Checkout.",
      ...otherPullRequest,
    },
    {
      id: "expired",
      label: "Box abgelaufen",
      description: "50 min später: TTL vorbei, open_repository baut neu auf.",
      ...expired,
    },
    {
      id: "disabled",
      label: "Flag aus",
      description:
        "Code-Recherche deaktiviert: keine Box, Writer ohne Briefing.",
      steps: disabledSteps(),
      startAt: 0,
    },
  ];
}
