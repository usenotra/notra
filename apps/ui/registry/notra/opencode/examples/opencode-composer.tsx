import { OpencodeComposer } from "../components/opencode-composer";
import { OpencodeWindow } from "../components/opencode-window";
import { OPENCODE_DEMO_SESSION } from "../constants/opencode-demo";

export default function OpencodeComposerExample() {
  const session = OPENCODE_DEMO_SESSION;

  return (
    <div className="w-full p-6">
      <OpencodeWindow className="gap-[1lh] px-[2ch] pt-[1lh] pb-[0.5lh]">
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
      </OpencodeWindow>
    </div>
  );
}
