import { Composition } from "remotion";

import { starVideoInputSchema } from "../schemas/star-video";
import {
  DEFAULT_STAR_VIDEO_PROPS,
  VIDEO_DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "./star-video/constants";
import { StarVideo } from "./star-video/star-video";

export function RemotionRoot() {
  return (
    <Composition
      component={StarVideo}
      defaultProps={DEFAULT_STAR_VIDEO_PROPS}
      durationInFrames={VIDEO_DURATION_IN_FRAMES}
      fps={VIDEO_FPS}
      height={VIDEO_HEIGHT}
      id="StarVideo"
      schema={starVideoInputSchema}
      width={VIDEO_WIDTH}
    />
  );
}
