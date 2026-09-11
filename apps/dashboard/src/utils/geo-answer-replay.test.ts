import { describe, expect, test } from "bun:test";

import { answerReplayState } from "./geo-answer-replay";

describe("answerReplayState", () => {
  test("shows the stored answer immediately when replay is idle", () => {
    expect(
      answerReplayState("Resend is a strong option.", null, false)
    ).toEqual({
      answerDone: true,
      showAssistant: true,
      showSearch: false,
      answerText: "Resend is a strong option.",
    });
  });

  test("keeps the assistant hidden while the user bubble is on screen", () => {
    expect(
      answerReplayState("Later.", { index: 0, stage: "user", typed: "" }, true)
    ).toEqual({
      answerDone: false,
      showAssistant: false,
      showSearch: false,
      answerText: "Later.",
    });
  });

  test("streams typed text without a thinking placeholder", () => {
    expect(
      answerReplayState(
        "Full answer",
        { index: 0, stage: "typing", typed: "Full" },
        true
      )
    ).toEqual({
      answerDone: false,
      showAssistant: true,
      showSearch: true,
      answerText: "Full",
    });
  });
});
