import { random } from "remotion";

import type { AvatarSlot, ConfettiPiece } from "../../types/star-video";

export const FONT_FAMILY =
  'Inter, "Helvetica Neue", Arial, system-ui, sans-serif';

export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const VIDEO_FPS = 30;
export const VIDEO_DURATION_IN_FRAMES = 300;

export const COUNT_START_FRAME = 12;
export const COUNT_DURATION_IN_FRAMES = 130;

const CONFETTI_COUNT = 90;
const AVATAR_COUNT = 44;
const AVATAR_SIZE = 64;
export const AVATAR_VERT_FACTOR = 0.64;

const RING_RADII = [270, 383, 496];
const AVATAR_SPACING = AVATAR_SIZE + 20;

function ellipsePerimeter(radius: number): number {
  const minor = radius * AVATAR_VERT_FACTOR;
  return 2 * Math.PI * Math.sqrt((radius * radius + minor * minor) / 2);
}

function ringCapacity(radius: number): number {
  return Math.max(1, Math.floor(ellipsePerimeter(radius) / AVATAR_SPACING));
}

const CONFETTI_COLORS = [
  "#f6a5c0",
  "#f7c948",
  "#7bd389",
  "#5eb0ef",
  "#a78bfa",
  "#f9846b",
  "#4fd1c5",
  "#f472b6",
] as const;

export const DEFAULT_BACKGROUND_COLOR = "#b9f0cd";

export const DEFAULT_STAR_VIDEO_PROPS = {
  owner: "usenotra",
  repo: "notra",
  stars: 84,
  avatars: [] as string[],
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
};

export function buildConfetti(seedNamespace: string): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let index = 0; index < CONFETTI_COUNT; index++) {
    const seed = `${seedNamespace}-confetti-${index}`;
    const colorIndex = Math.floor(
      random(`${seed}-color`) * CONFETTI_COLORS.length
    );
    pieces.push({
      seed,
      startX: random(`${seed}-x`) * 100,
      color: CONFETTI_COLORS[colorIndex] ?? CONFETTI_COLORS[0],
      size: 6 + random(`${seed}-size`) * 10,
      isCircle: random(`${seed}-shape`) > 0.5,
      phaseOffset: random(`${seed}-phase`),
      fallDuration: 150 + random(`${seed}-dur`) * 90,
      swayAmplitude: 20 + random(`${seed}-sway`) * 60,
      spin: 180 + random(`${seed}-spin`) * 720,
    });
  }
  return pieces;
}

function planRings(total: number): { radius: number; count: number }[] {
  const used: { radius: number; capacity: number }[] = [];
  let capacitySoFar = 0;
  for (const radius of RING_RADII) {
    if (capacitySoFar >= total) {
      break;
    }
    const capacity = ringCapacity(radius);
    used.push({ radius, capacity });
    capacitySoFar += capacity;
  }

  const totalCapacity = used.reduce((sum, ring) => sum + ring.capacity, 0);
  const rings = used.map((ring) => ({
    radius: ring.radius,
    count: Math.round((total * ring.capacity) / Math.max(totalCapacity, 1)),
  }));

  let assigned = rings.reduce((sum, ring) => sum + ring.count, 0);
  for (let i = rings.length - 1; i >= 0 && assigned > total; i--) {
    const ring = rings[i];
    if (ring && ring.count > 0) {
      ring.count -= 1;
      assigned -= 1;
    }
  }
  for (let i = rings.length - 1; i >= 0 && assigned < total; i--) {
    const ring = rings[i];
    if (ring) {
      ring.count += 1;
      assigned += 1;
    }
  }

  return rings.filter((ring) => ring.count > 0);
}

export function buildAvatarSlots(
  avatars: string[],
  seedNamespace: string
): AvatarSlot[] {
  const uniqueAvatars = [...new Set(avatars)];
  const slots: AvatarSlot[] = [];
  const total = Math.min(uniqueAvatars.length, AVATAR_COUNT);
  const rings = planRings(total);

  let index = 0;
  for (let ring = 0; ring < rings.length; ring++) {
    const current = rings[ring];
    if (!current) {
      continue;
    }
    const { radius, count } = current;
    const phase = ring * (Math.PI / count);
    const orbitDir = ring === 1 ? -1 : 1;
    for (let position = 0; position < count; position++) {
      const url = uniqueAvatars[index];
      if (!url) {
        index++;
        continue;
      }
      const seed = `${seedNamespace}-avatar-${index}`;
      const evenAngle = (position / count) * Math.PI * 2 + phase;
      slots.push({
        url,
        angle: evenAngle,
        radius,
        appearFrame:
          COUNT_START_FRAME +
          (index / Math.max(total, 1)) * COUNT_DURATION_IN_FRAMES,
        size: AVATAR_SIZE,
        floatPhase: random(`${seed}-phase`) * Math.PI * 2,
        orbitDir,
      });
      index++;
    }
  }
  return slots;
}
