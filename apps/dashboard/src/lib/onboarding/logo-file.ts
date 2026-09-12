import {
  ALLOWED_RASTER_MIME_TYPES,
  MAX_LOGO_FILE_SIZE,
} from "@notra/schemas/constants/dashboard/upload";

const BYTES_PER_MEGABYTE = 1024 * 1024;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read the selected image."));
      }
    };
    reader.onerror = () =>
      reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

export function validateLogoFile(file: File): string | null {
  if (!ALLOWED_RASTER_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
    return "Please choose a JPEG, PNG, GIF, WebP, or AVIF image.";
  }

  if (file.size > MAX_LOGO_FILE_SIZE) {
    return `Logo image must be less than ${MAX_LOGO_FILE_SIZE / BYTES_PER_MEGABYTE}MB.`;
  }

  return null;
}
