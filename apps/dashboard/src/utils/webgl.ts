/** True when this browser can create a WebGL2 context for PixelBlast. */
export function isWebGLAvailable(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}
