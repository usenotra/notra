import type {
  ColorPickerLabels,
  DropzoneLabels,
} from "@notra/ui/types/kibo-ui";

export const DEFAULT_COLOR_PICKER_LABELS: ColorPickerLabels = {
  selection: "Color saturation and lightness",
  selectionValue: (saturation, lightness) =>
    `Saturation ${saturation}%, Lightness ${lightness}%`,
  hue: "Hue",
  opacity: "Opacity",
  eyeDropper: "Pick a color from the screen",
  mode: "Mode",
};

export const DEFAULT_DROPZONE_LABELS: DropzoneLabels = {
  selectedFilesWithMore: (names, moreCount) => `${names} and ${moreCount} more`,
  replaceHint: "Drag and drop or click to replace",
  uploadTitle: (maxFiles) => `Upload ${maxFiles === 1 ? "a file" : "files"}`,
  uploadHint: "Drag and drop or click to upload",
  caption: ({ accept, minSize, maxSize }) => {
    let caption = accept ? `Accepts ${accept}` : "";
    if (minSize && maxSize) {
      caption += ` between ${minSize} and ${maxSize}`;
    } else if (minSize) {
      caption += ` at least ${minSize}`;
    } else if (maxSize) {
      caption += ` less than ${maxSize}`;
    }
    return caption ? `${caption}.` : "";
  },
};
