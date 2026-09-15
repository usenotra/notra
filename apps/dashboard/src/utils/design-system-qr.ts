const DEMO_QR_MODULES = 21;
const DEMO_QR_SCALE = 8;
const DEMO_FINDER_SIZE = 7;

function isFinderModule(x: number, y: number) {
  const inFinder = (originX: number, originY: number) => {
    const dx = x - originX;
    const dy = y - originY;
    if (dx < 0 || dy < 0 || dx >= DEMO_FINDER_SIZE || dy >= DEMO_FINDER_SIZE) {
      return null;
    }
    const ring = Math.min(
      dx,
      dy,
      DEMO_FINDER_SIZE - 1 - dx,
      DEMO_FINDER_SIZE - 1 - dy
    );
    return ring !== 1;
  };
  const offset = DEMO_QR_MODULES - DEMO_FINDER_SIZE;
  return inFinder(0, 0) ?? inFinder(offset, 0) ?? inFinder(0, offset);
}

/**
 * Deterministic QR-looking pattern (not scannable) so enrollment UIs render
 * without a real WorkOS secret. `seed` varies the data area.
 */
export function buildPlaceholderQrCode(seed = 0) {
  const rects: string[] = [];
  for (let y = 0; y < DEMO_QR_MODULES; y += 1) {
    for (let x = 0; x < DEMO_QR_MODULES; x += 1) {
      const finder = isFinderModule(x, y);
      const filled = finder ?? (x * 7 + y * 13 + x * y + seed) % 3 === 0;
      if (filled) {
        rects.push(
          `<rect x="${x * DEMO_QR_SCALE}" y="${y * DEMO_QR_SCALE}" width="${DEMO_QR_SCALE}" height="${DEMO_QR_SCALE}"/>`
        );
      }
    }
  }
  const size = DEMO_QR_MODULES * DEMO_QR_SCALE;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${rects.join("")}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
