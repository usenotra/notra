export interface DropzoneCaptionConstraints {
  accept?: string;
  minSize?: string;
  maxSize?: string;
}

export interface DropzoneLabels {
  selectedFilesWithMore: (names: string, moreCount: number) => string;
  replaceHint: string;
  uploadTitle: (maxFiles: number) => string;
  uploadHint: string;
  caption: (constraints: DropzoneCaptionConstraints) => string;
}

export interface ColorPickerLabels {
  selection: string;
  selectionValue: (saturation: number, lightness: number) => string;
  hue: string;
  opacity: string;
  eyeDropper: string;
  mode: string;
}
