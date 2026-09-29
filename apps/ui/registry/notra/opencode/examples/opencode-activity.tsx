import { OpencodeActivity } from "../components/opencode-activity";
import { OpencodeWindow } from "../components/opencode-window";
import { OPENCODE_DEMO_ACTIVITIES } from "../constants/opencode-demo";

export default function OpencodeActivityExample() {
  return (
    <div className="p-6">
      <OpencodeWindow className="p-5 sm:p-6">
        {OPENCODE_DEMO_ACTIVITIES.map(({ body, id, ...activity }) => (
          <OpencodeActivity key={id} {...activity}>
            {body}
          </OpencodeActivity>
        ))}
      </OpencodeWindow>
    </div>
  );
}
