import { OpencodeSidebar } from "../components/opencode-sidebar";
import { OpencodeWindow } from "../components/opencode-window";
import { OPENCODE_DEMO_SESSION } from "../constants/opencode-demo";

export default function OpencodeSidebarExample() {
  const session = OPENCODE_DEMO_SESSION;

  return (
    <div className="p-4">
      <OpencodeWindow className="max-w-sm">
        <OpencodeSidebar
          className="border-s-0"
          cwd={session.cwd}
          servers={session.servers}
          title={session.title}
          tokens={session.tokens}
          used={session.used}
          version={session.version}
        />
      </OpencodeWindow>
    </div>
  );
}
