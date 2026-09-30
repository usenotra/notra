import { OpencodeComposer } from "../components/opencode-composer";
import { OpencodeLogo } from "../components/opencode-logo";
import { OpencodeWindow } from "../components/opencode-window";
import { OPENCODE_DEMO_SESSION } from "../constants/opencode-demo";

export default function OpencodeLogoExample() {
  return (
    <div className="p-6">
      <OpencodeWindow>
        <div className="flex flex-col px-5 py-4">
          <div className="m-auto w-full max-w-xl">
            <OpencodeLogo
              className="mx-auto mb-5 h-auto max-w-full"
              scale={1.2}
            />
            <OpencodeComposer />
            <p className="text-opencode-muted mt-5 mb-4 text-center text-[0.8125rem] leading-[1.3]">
              <span className="text-opencode-orange">● Tip</span> Create JSON
              theme files in{" "}
              <span className="text-opencode-fg">.opencode/themes/</span>{" "}
              directory
            </p>
          </div>
          <div className="text-opencode-muted flex items-center justify-between text-[0.8125rem] leading-[1.3]">
            <span>{OPENCODE_DEMO_SESSION.cwd} · 3 MCP</span>
            <span>{OPENCODE_DEMO_SESSION.version}</span>
          </div>
        </div>
      </OpencodeWindow>
    </div>
  );
}
