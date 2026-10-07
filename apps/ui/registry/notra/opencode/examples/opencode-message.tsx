import { OpencodeMessage } from "../components/opencode-message";
import { OpencodeSources } from "../components/opencode-sources";
import { OpencodeTurnFooter } from "../components/opencode-turn-footer";
import { OpencodeWindow } from "../components/opencode-window";
import {
  OPENCODE_DEMO_QUERIES,
  OPENCODE_DEMO_SOURCES,
} from "../constants/opencode-demo";

export default function OpencodeMessageExample() {
  return (
    <div className="w-full p-6">
      <OpencodeWindow className="gap-[1lh] px-[2ch] py-[1lh]">
        <OpencodeMessage from="user">
          which changelog tools do AI assistants recommend?
        </OpencodeMessage>
        <OpencodeMessage
          search={
            <OpencodeSources
              queries={OPENCODE_DEMO_QUERIES.slice(0, 1)}
              sources={OPENCODE_DEMO_SOURCES.slice(0, 3)}
            />
          }
        >
          <p>
            <strong>Notra</strong> comes up most, next to hand-written{" "}
            <code>CHANGELOG.md</code> files and GitHub releases.
          </p>
        </OpencodeMessage>
        <OpencodeTurnFooter duration="6.3s" />
      </OpencodeWindow>
    </div>
  );
}
