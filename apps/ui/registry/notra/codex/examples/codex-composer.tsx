import { CodexComposer } from "../components/codex-composer";
import { CodexHeader } from "../components/codex-header";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexComposerExample() {
  const { composer, header, title } = CODEX_DEMO_SESSION;

  return (
    <div className="w-full p-6">
      <CodexTerminal
        footer={
          <CodexComposer
            cwd={header.cwd}
            effort={composer.effort}
            model={composer.model}
            placeholder={composer.placeholder}
            task={composer.task}
            warnings={composer.warnings}
          />
        }
        title={title}
      >
        <CodexHeader {...header} />
      </CodexTerminal>
    </div>
  );
}
