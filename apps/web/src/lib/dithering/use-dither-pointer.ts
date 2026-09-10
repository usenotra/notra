"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type {
  DitherPointerOffset,
  DitherPointerOptions,
  DitherPointerResult,
} from "@/types/dithering";
import {
  getDitherEnvironmentServerSnapshot,
  getFinePointerSnapshot,
  subscribeToFinePointer,
} from "@/utils/dither-environment";
import { getDitherPointerOffset } from "@/utils/dither-pointer-offset";
import {
  getReducedMotionServerSnapshot,
  getReducedMotionSnapshot,
  subscribeToReducedMotion,
} from "@/utils/reduced-motion";

const SETTLE_DISTANCE_SQUARED = 1e-6;

const REST_OFFSET: DitherPointerOffset = { offsetX: 0, offsetY: 0 };

export function useDitherPointer({
  restSpeed,
  hoverSpeed = restSpeed,
  offsetRange,
  lerp,
  visibleYRatio = 1,
}: DitherPointerOptions): DitherPointerResult {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const hasFinePointer = useSyncExternalStore(
    subscribeToFinePointer,
    getFinePointerSnapshot,
    getDitherEnvironmentServerSnapshot
  );
  const enabled = hasFinePointer && !prefersReducedMotion;

  const [offset, setOffset] = useState<DitherPointerOffset>(REST_OFFSET);
  const [isHovering, setIsHovering] = useState(false);

  const current = useRef(REST_OFFSET);
  const target = useRef(REST_OFFSET);
  const frame = useRef(0);
  const optionsRef = useRef({ enabled, offsetRange, lerp, visibleYRatio });

  useEffect(() => {
    optionsRef.current = { enabled, offsetRange, lerp, visibleYRatio };
  });

  useEffect(() => {
    if (enabled) {
      return;
    }
    target.current = REST_OFFSET;
    current.current = REST_OFFSET;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    setOffset(REST_OFFSET);
    setIsHovering(false);
  }, [enabled]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    []
  );

  function tick() {
    const { lerp: follow } = optionsRef.current;
    const nextX =
      current.current.offsetX +
      (target.current.offsetX - current.current.offsetX) * follow;
    const nextY =
      current.current.offsetY +
      (target.current.offsetY - current.current.offsetY) * follow;
    const distanceSquared =
      (target.current.offsetX - nextX) ** 2 +
      (target.current.offsetY - nextY) ** 2;
    const nextOffset =
      distanceSquared < SETTLE_DISTANCE_SQUARED
        ? target.current
        : { offsetX: nextX, offsetY: nextY };

    current.current = nextOffset;
    setOffset(nextOffset);

    if (distanceSquared < SETTLE_DISTANCE_SQUARED) {
      frame.current = 0;
      return;
    }

    frame.current = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (frame.current) {
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }

  function aimAtPointer(event: {
    clientX: number;
    clientY: number;
    currentTarget: EventTarget;
  }) {
    const {
      enabled: canTrack,
      offsetRange: range,
      visibleYRatio: yRatio,
    } = optionsRef.current;
    if (!canTrack) {
      return;
    }
    const node = event.currentTarget;
    if (!(node instanceof HTMLElement)) {
      return;
    }
    target.current = getDitherPointerOffset(
      event.clientX,
      event.clientY,
      node.getBoundingClientRect(),
      range,
      yRatio
    );
    startLoop();
  }

  function onPointerEnter(event: {
    clientX: number;
    clientY: number;
    currentTarget: EventTarget;
  }) {
    if (!optionsRef.current.enabled) {
      return;
    }
    setIsHovering(true);
    aimAtPointer(event);
  }

  function onPointerMove(event: {
    clientX: number;
    clientY: number;
    currentTarget: EventTarget;
  }) {
    aimAtPointer(event);
  }

  function onPointerLeave() {
    setIsHovering(false);
    target.current = REST_OFFSET;
    if (optionsRef.current.enabled) {
      startLoop();
    }
  }

  const shownOffset = enabled ? offset : REST_OFFSET;

  return {
    offsetX: shownOffset.offsetX,
    offsetY: shownOffset.offsetY,
    speed: enabled && isHovering ? hoverSpeed : restSpeed,
    isHovering: enabled && isHovering,
    pointerProps: {
      onPointerEnter,
      onPointerMove,
      onPointerLeave,
    },
  };
}
