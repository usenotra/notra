import { OpencodeSources } from "../components/opencode-sources";
import { OpencodeWindow } from "../components/opencode-window";
import {
  OPENCODE_DEMO_QUERIES,
  OPENCODE_DEMO_SOURCES,
} from "../constants/opencode-demo";

export default function OpencodeSourcesExample() {
  return (
    <div className="w-full p-6">
      <OpencodeWindow className="px-[2ch] py-[1lh]">
        <OpencodeSources
          defaultOpen
          queries={OPENCODE_DEMO_QUERIES}
          sources={OPENCODE_DEMO_SOURCES}
        />
      </OpencodeWindow>
    </div>
  );
}
