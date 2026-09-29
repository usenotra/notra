import { ItemGroup } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";

import { OpencodeActivity } from "../components/opencode-activity";
import { OpencodeComposer } from "../components/opencode-composer";
import { OpencodeMessage } from "../components/opencode-message";
import { OpencodeSidebar } from "../components/opencode-sidebar";
import { OpencodeSources } from "../components/opencode-sources";
import { OpencodeWindow } from "../components/opencode-window";
import {
  OPENCODE_DEMO_SESSION,
  OPENCODE_DEMO_SOURCES,
} from "../constants/opencode-demo";

export default function OpencodeDemo() {
  const session = OPENCODE_DEMO_SESSION;

  return (
    <div className="w-full min-w-0">
      <OpencodeWindow className="h-150">
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="flex min-h-0 min-w-0 flex-col">
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-[1.0625rem] p-4 pb-0 sm:p-6 sm:pb-0">
                <OpencodeMessage from="user">
                  {session.userMessage}
                </OpencodeMessage>
                <OpencodeMessage>{session.assistantMessage}</OpencodeMessage>
                <ItemGroup className="gap-0">
                  {session.activities.map(({ body, id, ...activity }) => (
                    <OpencodeActivity key={id} role="listitem" {...activity}>
                      {body}
                    </OpencodeActivity>
                  ))}
                </ItemGroup>
                <OpencodeSources sources={OPENCODE_DEMO_SOURCES} />
                <OpencodeMessage>{session.resultMessage}</OpencodeMessage>
              </div>
            </ScrollArea>
            <OpencodeComposer
              className="shrink-0 px-4 pt-[1.0625rem] pb-4 sm:px-6 sm:pb-6"
              context={session.context}
              placeholder={session.promptPlaceholder}
            />
          </div>
          <OpencodeSidebar
            className="hidden min-h-0 md:flex"
            cwd={session.cwd}
            servers={session.servers}
            title={session.title}
            tokens={session.tokens}
            used={session.used}
            version={session.version}
          />
        </div>
      </OpencodeWindow>
    </div>
  );
}
