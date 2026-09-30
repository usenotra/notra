import { OpencodeActivity } from "../components/opencode-activity";
import { OpencodeWindow } from "../components/opencode-window";
import { OPENCODE_DEMO_ACTIVITIES } from "../constants/opencode-demo";

export default function OpencodeActivityExample() {
  const [thought, ...tools] = OPENCODE_DEMO_ACTIVITIES;

  return (
    <div className="w-full p-6">
      <OpencodeWindow className="gap-[1lh] px-[2ch] py-[1lh]">
        {thought && (
          <OpencodeActivity duration={thought.duration} kind={thought.kind}>
            {thought.body}
          </OpencodeActivity>
        )}
        <div>
          {tools.map(({ body, id, ...activity }) => (
            <OpencodeActivity key={id} {...activity}>
              {body}
            </OpencodeActivity>
          ))}
        </div>
        <OpencodeActivity kind="thought" pending />
      </OpencodeWindow>
    </div>
  );
}
