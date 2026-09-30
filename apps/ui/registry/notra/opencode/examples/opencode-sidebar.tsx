import { OpencodeSidebar } from "../components/opencode-sidebar";
import { OpencodeWindow } from "../components/opencode-window";
import { OPENCODE_DEMO_SESSION } from "../constants/opencode-demo";

export default function OpencodeSidebarExample() {
  const session = OPENCODE_DEMO_SESSION;

  return (
    <div className="w-full p-6">
      <OpencodeWindow className="h-120 max-w-xs">
        <OpencodeSidebar
          branch={session.branch}
          className="flex-1"
          cwd={session.cwd}
          servers={session.servers}
          spent={session.spent}
          title={session.title}
          tokens={session.tokens}
          used={session.used}
          version={session.version}
        />
      </OpencodeWindow>
    </div>
  );
}
