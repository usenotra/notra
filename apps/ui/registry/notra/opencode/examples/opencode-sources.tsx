import { OpencodeSources } from "../components/opencode-sources";
import { OpencodeWindow } from "../components/opencode-window";
import {
  OPENCODE_DEMO_QUERIES,
  OPENCODE_DEMO_SOURCES,
} from "../constants/opencode-demo";

export default function OpencodeSourcesExample() {
  return (
    <div className="p-6">
      <OpencodeWindow className="p-5 sm:p-6">
        <OpencodeSources
          defaultOpen
          queries={OPENCODE_DEMO_QUERIES}
          sources={OPENCODE_DEMO_SOURCES.slice(0, 4)}
        />
      </OpencodeWindow>
    </div>
  );
}
