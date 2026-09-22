"use client";

import {
  FullScreenIcon,
  MinimizeScreenIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function ContentVideoPlayer({ src }: { src: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === frameRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      video.play().catch(() => setPlaying(false));
      return;
    }
    video.pause();
  }

  function toggleMuted() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function toggleFullscreen() {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    if (document.fullscreenElement === frame) {
      document.exitFullscreen().catch(() => undefined);
      return;
    }
    frame.requestFullscreen().catch(() => undefined);
  }

  function seek(value: string) {
    const video = videoRef.current;
    const next = Number(value);
    if (!video || !Number.isFinite(next)) {
      return;
    }
    video.currentTime = next;
    setCurrent(next);
  }

  return (
    <div
      className={
        fullscreen
          ? "flex h-full flex-col overflow-hidden bg-black"
          : "bg-background ring-foreground/10 overflow-hidden rounded-xl ring-1"
      }
      ref={frameRef}
    >
      <div
        className={
          fullscreen ? "relative min-h-0 flex-1 bg-black" : "relative bg-black"
        }
      >
        {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- uploads do not include a caption file */}
        <video
          aria-label="Video"
          className={
            fullscreen ? "h-full w-full object-contain" : "max-h-128 w-full"
          }
          onDurationChange={(event) =>
            setDuration(event.currentTarget.duration)
          }
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
          playsInline
          preload="metadata"
          ref={videoRef}
          src={src}
        />
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
          onClick={togglePlay}
          onMouseDown={(event) => event.preventDefault()}
        >
          {playing ? null : (
            <span className="bg-background/95 text-foreground ring-foreground/10 flex size-12 items-center justify-center rounded-full ring-1">
              <HugeiconsIcon
                className="ml-0.5 size-5"
                icon={PlayIcon}
                strokeWidth={2}
              />
            </span>
          )}
        </div>
      </div>
      <div className="border-border bg-background flex items-center gap-1.5 border-t px-2 py-1.5">
        <Button
          aria-label={playing ? "Pause" : "Play"}
          onClick={togglePlay}
          onMouseDown={(event) => event.preventDefault()}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            className={playing ? undefined : "ml-0.5"}
            icon={playing ? PauseIcon : PlayIcon}
            strokeWidth={2}
          />
        </Button>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {formatClock(current)}
          <span className="px-1">/</span>
          {formatClock(duration)}
        </span>
        <input
          aria-label="Seek"
          aria-valuemax={Number.isFinite(duration) ? duration : 0}
          aria-valuemin={0}
          aria-valuenow={current}
          className="accent-foreground h-1 min-w-0 flex-1 cursor-pointer"
          max={Number.isFinite(duration) ? duration : 0}
          min={0}
          onChange={(event) => seek(event.target.value)}
          onMouseDown={(event) => event.stopPropagation()}
          step="0.1"
          type="range"
          value={Number.isFinite(current) ? current : 0}
        />
        <Button
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          onClick={toggleMuted}
          onMouseDown={(event) => event.preventDefault()}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            icon={muted ? VolumeOffIcon : VolumeHighIcon}
            strokeWidth={2}
          />
        </Button>
        <Button
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          onClick={toggleFullscreen}
          onMouseDown={(event) => event.preventDefault()}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            icon={fullscreen ? MinimizeScreenIcon : FullScreenIcon}
            strokeWidth={2}
          />
        </Button>
      </div>
    </div>
  );
}
