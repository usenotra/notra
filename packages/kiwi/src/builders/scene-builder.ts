import { IDENTITY_TRANSFORM } from "../constants/scene";
import type {
  AddFrameOptions,
  AddTextOptions,
  AddVectorOptions,
  FigmaEffect,
  Guid,
  SceneNode,
  SolidFill,
  Transform,
} from "../types/scene";
import { encodeVectorNetwork } from "../utils/vector-network";

export type {
  AddFrameOptions,
  AddTextOptions,
  AddVectorOptions,
  Color,
  DerivedTextData,
  FigmaEffect,
  Guid,
  RGBA,
  SceneNode,
  SolidFill,
  TextBaseline,
  TextGlyph,
  Transform,
} from "../types/scene";

export function positionFor(index: number): string {
  if (index < 94) {
    return String.fromCharCode(0x21 + index);
  }
  throw new Error("more than 94 siblings not yet supported");
}

export function solidFill(r: number, g: number, b: number, a = 1): SolidFill {
  const opacity = Math.max(0, Math.min(1, a));
  return {
    type: "SOLID",
    color: { r, g, b, a: 1 },
    opacity,
    visible: true,
    blendMode: "NORMAL",
  };
}

export function dropShadowEffect(
  options: {
    dx?: number;
    dy?: number;
    blur?: number;
    spread?: number;
    color?: [number, number, number, number];
    opacity?: number;
  } = {}
): FigmaEffect {
  const [r = 0, g = 0, b = 0, a = 1] = options.color ?? [];
  // Figma DropShadowEffect carries alpha in color.a (no opacity field).
  const alpha = Math.max(0, Math.min(1, finiteOr(options.opacity ?? a, 1)));
  const dx = finiteOr(options.dx, 0);
  const dy = finiteOr(options.dy, 4);
  const blur = Math.max(0, finiteOr(options.blur, 4));
  const spread = finiteOr(options.spread, 0);
  return {
    type: "DROP_SHADOW",
    visible: true,
    blendMode: "NORMAL",
    color: {
      r: finiteOr(r, 0),
      g: finiteOr(g, 0),
      b: finiteOr(b, 0),
      a: alpha,
    },
    offset: { x: dx, y: dy },
    radius: blur,
    spread,
    showShadowBehindNode: false,
  };
}

export function layerBlurEffect(radius: number): FigmaEffect {
  return {
    // The bundled Figma schema has no LAYER_BLUR — a layer blur is FOREGROUND_BLUR.
    type: "FOREGROUND_BLUR",
    visible: true,
    radius: Math.max(0, finiteOr(radius, 0)),
  };
}

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function applyNodeExtras(
  node: SceneNode,
  options: {
    opacity?: number;
    blendMode?: string;
    effects?: FigmaEffect[];
    mask?: boolean | null;
    maskType?: string | null;
  }
): void {
  if (options.opacity !== undefined && Number.isFinite(options.opacity)) {
    node.opacity = Math.max(0, Math.min(1, options.opacity));
  }
  if (options.blendMode) {
    node.blendMode = options.blendMode;
  }
  if (options.effects && options.effects.length > 0) {
    node.effects = options.effects;
  }
  if (options.mask) {
    node.mask = true;
    node.maskType = options.maskType ?? "ALPHA";
  }
}

export function transformAt(x: number, y: number): Transform {
  return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
}

function cloneTransform(t: Transform): Transform {
  return { ...t };
}

function optionTransform(options: {
  transform?: Transform;
  x?: number;
  y?: number;
}): Transform {
  return options.transform
    ? cloneTransform(options.transform)
    : transformAt(options.x ?? 0, options.y ?? 0);
}

export class SceneBuilder {
  sessionID: number;
  pasteID: number;
  pasteFileKey: string;

  nodes: SceneNode[] = [];
  blobs: Uint8Array[] = [];

  private nextLocal = 1;
  private readonly childCounts = new Map<string, number>();

  constructor(options?: {
    sessionID?: number;
    pasteID?: number;
    pasteFileKey?: string;
  }) {
    this.sessionID = options?.sessionID ?? 100;
    this.pasteID =
      options?.pasteID ?? Math.floor(Math.random() * 0x7f_ff_ff_ff) + 1;
    this.pasteFileKey = options?.pasteFileKey ?? "scene-from-html";

    this.nodes.push(this.documentNode());
    this.nodes.push(this.canvasNode());
    this.nodes.push(this.internalCanvasNode());
  }

  get canvasGuid(): Guid {
    return { sessionID: this.sessionID, localID: 0 };
  }

  private documentNode(): SceneNode {
    return {
      guid: { sessionID: 0, localID: 0 },
      phase: "CREATED",
      type: "DOCUMENT",
      name: "Document",
      visible: true,
      opacity: 1,
      transform: cloneTransform(IDENTITY_TRANSFORM),
      slideThemeMap: { entries: [] },
    };
  }

  private canvasNode(): SceneNode {
    return {
      guid: { sessionID: this.sessionID, localID: 0 },
      phase: "CREATED",
      parentIndex: {
        guid: { sessionID: 0, localID: 0 },
        position: "!",
      },
      type: "CANVAS",
      name: "Page 1",
      visible: true,
      opacity: 1,
      transform: cloneTransform(IDENTITY_TRANSFORM),
      backgroundOpacity: 1,
      backgroundEnabled: true,
    };
  }

  private internalCanvasNode(): SceneNode {
    return {
      guid: { sessionID: 20_000_297, localID: 2 },
      phase: "CREATED",
      parentIndex: {
        guid: { sessionID: 0, localID: 0 },
        position: "~",
      },
      type: "CANVAS",
      name: "Internal Only Canvas",
      visible: false,
      opacity: 1,
      transform: cloneTransform(IDENTITY_TRANSFORM),
      backgroundOpacity: 1,
      backgroundEnabled: true,
      internalOnly: true,
    };
  }

  private allocLocal(): number {
    const id = this.nextLocal;
    this.nextLocal += 1;
    return id;
  }

  private nextChildPosition(parent: Guid): string {
    const key = `${parent.sessionID}:${parent.localID}`;
    const idx = this.childCounts.get(key) ?? 0;
    this.childCounts.set(key, idx + 1);
    return positionFor(idx);
  }

  addFrame(options: AddFrameOptions): Guid {
    const parent = options.parent ?? this.canvasGuid;
    const guid: Guid = {
      sessionID: this.sessionID,
      localID: this.allocLocal(),
    };
    const [padTop, padRight, padBottom, padLeft] = options.padding ?? [
      0, 0, 0, 0,
    ];
    const radii = options.cornerRadii ?? [0, 0, 0, 0];
    const [tl, tr, br, bl] = radii;
    const hasRadius = tl > 0 || tr > 0 || br > 0 || bl > 0;
    const uniformRadius = tl === tr && tr === br && br === bl;

    const stroke = options.stroke;
    const hasStroke = stroke != null;
    const node: SceneNode = {
      guid,
      phase: "CREATED",
      parentIndex: { guid: parent, position: this.nextChildPosition(parent) },
      type: "FRAME",
      name: options.name ?? "Frame",
      visible: true,
      opacity: 1,
      size: { x: options.width, y: options.height },
      transform: optionTransform(options),
      strokeWeight: hasStroke ? (options.strokeWeight ?? 1) : 1,
      strokeAlign: "INSIDE",
      strokeJoin: "MITER",
      fillPaints: options.fill ? [options.fill] : [],
      effects: [],
      horizontalConstraint: "MIN",
      verticalConstraint: "MIN",
      stackMode: options.stackMode ?? "NONE",
      stackSpacing: options.stackSpacing ?? 0,
      stackHorizontalPadding: padLeft,
      stackVerticalPadding: padTop,
      stackPaddingRight: padRight,
      stackPaddingBottom: padBottom,
      stackPrimaryAlignItems: "MIN",
      stackCounterAlignItems: "MIN",
      stackReverseZIndex: false,
      stackCounterSizing: "FIXED",
      frameMaskDisabled: !options.clipsContent,
    };

    applyNodeExtras(node, options);

    if (hasRadius) {
      if (uniformRadius) {
        node.cornerRadius = tl;
      } else {
        node.rectangleTopLeftCornerRadius = tl;
        node.rectangleTopRightCornerRadius = tr;
        node.rectangleBottomRightCornerRadius = br;
        node.rectangleBottomLeftCornerRadius = bl;
        node.rectangleCornerRadiiIndependent = true;
      }
    }

    if (hasStroke) {
      node.strokePaints = [stroke];
      node.bordersTakeSpace = true;
    }

    this.nodes.push(node);
    return guid;
  }

  addText(options: AddTextOptions): Guid {
    const guid: Guid = {
      sessionID: this.sessionID,
      localID: this.allocLocal(),
    };
    const color = options.color ?? [0, 0, 0, 1];
    const lineHeight = options.lineHeight ?? 0;
    const letterSpacing = options.letterSpacing ?? 0;
    const fontFamily = options.fontFamily ?? "Inter";
    const fontStyle = options.fontStyle ?? "Regular";
    const fontSize = options.fontSize ?? 16;

    const node: SceneNode = {
      guid,
      phase: "CREATED",
      parentIndex: {
        guid: options.parent,
        position: this.nextChildPosition(options.parent),
      },
      type: "TEXT",
      name: options.name ?? (options.text ? options.text.slice(0, 30) : "Text"),
      visible: true,
      opacity: 1,
      size: { x: options.width ?? 0, y: options.height ?? 0 },
      transform: optionTransform(options),
      strokeWeight: 1,
      strokeAlign: "OUTSIDE",
      strokeJoin: "MITER",
      fillPaints: [solidFill(color[0], color[1], color[2], color[3])],
      textData: {
        characters: options.text,
        lines: [
          {
            lineType: "PLAIN",
            styleId: 0,
            indentationLevel: 0,
            sourceDirectionality: "AUTO",
            listStartOffset: 0,
            isFirstLineOfList: false,
          },
        ],
      },
      derivedTextData: options.derivedTextData,
      fontName: { family: fontFamily, style: fontStyle, postscript: "" },
      fontSize,
      fontVariations: [],
      fontVersion: "",
      fontVariantCommonLigatures: true,
      fontVariantContextualLigatures: true,
      lineHeight: {
        value: lineHeight,
        units: lineHeight === 0 ? "RAW" : "PIXELS",
      },
      letterSpacing: { value: letterSpacing, units: "PIXELS" },
      textAlignHorizontal: options.alignHorizontal ?? "LEFT",
      textAlignVertical: options.alignVertical ?? "TOP",
      textAutoResize: options.autoResize ?? "WIDTH_AND_HEIGHT",
      textBidiVersion: 1,
      textExplicitLayoutVersion: 1,
      textUserLayoutVersion: 4,
      autoRename: !options.name,
      detachOpticalSizeFromFontSize: true,
      stackChildAlignSelf: "AUTO",
    };
    this.nodes.push(node);
    return guid;
  }

  addBlob(bytes: Uint8Array): number {
    const index = this.blobs.length;
    this.blobs.push(bytes);
    return index;
  }

  addVector(options: AddVectorOptions): Guid {
    const guid: Guid = {
      sessionID: this.sessionID,
      localID: this.allocLocal(),
    };
    const blob = encodeVectorNetwork(options.network);
    const blobIndex = this.blobs.length;
    this.blobs.push(blob);

    const stroke = options.stroke;
    const hasStroke = stroke != null;
    const node: SceneNode = {
      guid,
      phase: "CREATED",
      parentIndex: {
        guid: options.parent,
        position: this.nextChildPosition(options.parent),
      },
      type: "VECTOR",
      name: options.name ?? "Vector",
      visible: true,
      opacity: 1,
      size: { x: options.width, y: options.height },
      transform: optionTransform(options),
      strokeWeight: hasStroke ? (options.strokeWeight ?? 1) : 0,
      strokeAlign: "CENTER",
      strokeCap: options.strokeCap ?? "NONE",
      dashPattern: hasStroke ? options.dashPattern : undefined,
      strokeJoin: options.strokeJoin ?? "MITER",
      fillPaints: options.fill ? [options.fill] : [],
      effects: [],
      horizontalConstraint: "MIN",
      verticalConstraint: "MIN",
      frameMaskDisabled: true,
      vectorData: { vectorNetworkBlob: blobIndex },
    };

    applyNodeExtras(node, options);

    if (hasStroke) {
      node.strokePaints = [stroke];
    }

    this.nodes.push(node);
    return guid;
  }

  toMessage(): Record<string, unknown> {
    return {
      type: "NODE_CHANGES",
      sessionID: 0,
      ackID: 0,
      pasteID: this.pasteID,
      pasteFileKey: this.pasteFileKey,
      pasteEditorType: "DESIGN",
      pasteIsPartiallyOutsideEnclosingFrame: false,
      publishedAssetGuids: [],
      pastePageId: { sessionID: 0, localID: 1 },
      isCut: false,
      nodeChanges: this.nodes,
      blobs: this.blobs.map((bytes) => ({ bytes })),
    };
  }
}
