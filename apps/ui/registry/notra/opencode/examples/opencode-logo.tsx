import { OpencodeComposer } from "../components/opencode-composer";
import { OpencodeLogo } from "../components/opencode-logo";
import { OpencodeWindow } from "../components/opencode-window";
import { OPENCODE_DEMO_SESSION } from "../constants/opencode-demo";

export default function OpencodeLogoExample() {
  const session = OPENCODE_DEMO_SESSION;

  return (
    <div className="w-full p-6">
      <OpencodeWindow className="px-[2ch] pt-[2lh] pb-[0.5lh]">
        <div className="m-auto flex w-full max-w-xl flex-col gap-[2lh]">
          <OpencodeLogo className="mx-auto h-auto max-w-full" />
          <OpencodeComposer
            agent={session.agent}
            effort={session.effort}
            model={session.model}
            provider={session.provider}
          />
          <p className="text-opencode-muted text-center">
            <span className="text-opencode-orange">● Tip</span> Press{" "}
            <span className="text-opencode-fg">tab</span> to switch between the
            Build and Plan agents
          </p>
        </div>
        <div className="text-opencode-muted mt-[2lh] flex justify-between gap-[2ch]">
          <span className="truncate">
            {session.cwd}:{session.branch}
          </span>
          <span>{session.version}</span>
        </div>
      </OpencodeWindow>
    </div>
  );
}
