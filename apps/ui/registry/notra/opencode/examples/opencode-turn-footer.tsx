import { OpencodeTurnFooter } from "../components/opencode-turn-footer";
import { OpencodeWindow } from "../components/opencode-window";

export default function OpencodeTurnFooterExample() {
  return (
    <div className="w-full p-6">
      <OpencodeWindow className="gap-[1lh] px-[2ch] py-[1lh]">
        <OpencodeTurnFooter duration="17.8s" />
        <OpencodeTurnFooter agent="Plan" model="GPT-5.6 Sol" />
      </OpencodeWindow>
    </div>
  );
}
