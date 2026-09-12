import { MockFrame } from "@/components/landing/mock-frame";
import { ShareOfVoiceRows } from "@/components/landing/share-of-voice-rows";
import {
  FEATURES_SHARE_FRAME,
  FEATURES_SHARE_HEADERS,
  FEATURES_SHARE_ROWS,
} from "@/constants/landing/features";

export function FeaturesCardShare() {
  return (
    <MockFrame
      heading={FEATURES_SHARE_FRAME.heading}
      subhead={FEATURES_SHARE_FRAME.subhead}
    >
      <ShareOfVoiceRows
        headers={FEATURES_SHARE_HEADERS}
        rows={FEATURES_SHARE_ROWS}
      />
    </MockFrame>
  );
}
