"use client";

import { ColorPickerIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Color from "color";
import { Slider } from "@base-ui/react/slider";

import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  type KeyboardEvent,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@notra/ui/components/ui/button";
import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { cn } from "@notra/ui/lib/utils";

type ColorState = {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
};

type ColorPickerContextValue = ColorState & {
  mode: string;
  commit: (partial: Partial<ColorState>) => void;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setLightness: (lightness: number) => void;
  setAlpha: (alpha: number) => void;
  setMode: (mode: string) => void;
};

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
  undefined,
);

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error("useColorPicker must be used within a ColorPickerProvider");
  }

  return context;
};

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
  value?: Parameters<typeof Color>[0];
  defaultValue?: Parameters<typeof Color>[0];
  onChange?: (value: Parameters<typeof Color.rgb>[0]) => void;
};

export const ColorPicker = ({
  value,
  defaultValue = "#000000",
  onChange,
  className,
  ...props
}: ColorPickerProps) => {
  const [initialState] = useState<ColorState>(() => {
    const color = Color(value ?? defaultValue);
    return {
      hue: color.hue(),
      saturation: color.saturationl(),
      lightness: color.lightness(),
      alpha: color.alpha() * 100,
    };
  });
  const [hue, setHue] = useState(initialState.hue);
  const [saturation, setSaturation] = useState(initialState.saturation);
  const [lightness, setLightness] = useState(initialState.lightness);
  const [alpha, setAlpha] = useState(initialState.alpha);
  const [mode, setMode] = useState("hex");
  const onChangeRef = useRef(onChange);
  const stateRef = useRef<ColorState>(initialState);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Update color when controlled value changes
  useEffect(() => {
    if (value) {
      const color = Color(value);
      const next = {
        hue: color.hue(),
        saturation: color.saturationl(),
        lightness: color.lightness(),
        alpha: color.alpha() * 100,
      };

      stateRef.current = next;
      setHue(next.hue);
      setSaturation(next.saturation);
      setLightness(next.lightness);
      setAlpha(next.alpha);
    }
  }, [value]);

  // Notify the parent directly from user-driven updates
  const commit = useCallback((partial: Partial<ColorState>) => {
    const next = { ...stateRef.current, ...partial };
    stateRef.current = next;
    setHue(next.hue);
    setSaturation(next.saturation);
    setLightness(next.lightness);
    setAlpha(next.alpha);

    const handler = onChangeRef.current;
    if (handler) {
      const color = Color.hsl(next.hue, next.saturation, next.lightness).alpha(
        next.alpha / 100,
      );
      const rgba = color.rgb().array();

      handler([rgba[0], rgba[1], rgba[2], next.alpha / 100]);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      hue,
      saturation,
      lightness,
      alpha,
      mode,
      commit,
      setHue: (nextHue: number) => commit({ hue: nextHue }),
      setSaturation: (nextSaturation: number) =>
        commit({ saturation: nextSaturation }),
      setLightness: (nextLightness: number) =>
        commit({ lightness: nextLightness }),
      setAlpha: (nextAlpha: number) => commit({ alpha: nextAlpha }),
      setMode,
    }),
    [hue, saturation, lightness, alpha, mode, commit],
  );

  return (
    <ColorPickerContext.Provider value={contextValue}>
      <div
        className={cn("flex size-full flex-col gap-4", className)}
        {...props}
      />
    </ColorPickerContext.Provider>
  );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(
  ({ className, ...props }: ColorPickerSelectionProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { hue, saturation, lightness, commit } = useColorPicker();

    const [, hsvSaturation = 0, hsvValue = 0] = Color.hsl(
      hue,
      saturation,
      lightness,
    )
      .hsv()
      .array();
    const positionX = hsvSaturation / 100;
    const positionY = 1 - hsvValue / 100;

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      const saturationStep = 2;
      const lightnessStep = 2;
      let nextSaturation = saturation;
      let nextLightness = lightness;

      switch (event.key) {
        case "ArrowLeft":
          nextSaturation = Math.max(0, saturation - saturationStep);
          break;
        case "ArrowRight":
          nextSaturation = Math.min(100, saturation + saturationStep);
          break;
        case "ArrowUp":
          nextLightness = Math.min(100, lightness + lightnessStep);
          break;
        case "ArrowDown":
          nextLightness = Math.max(0, lightness - lightnessStep);
          break;
        default:
          return;
      }

      event.preventDefault();
      commit({ saturation: nextSaturation, lightness: nextLightness });
    };

    const commitFromPosition = useCallback(
      (x: number, y: number) => {
        const [, nextSaturation = 0, nextLightness = 0] = Color.hsv(
          hue,
          x * 100,
          (1 - y) * 100,
        )
          .hsl()
          .array();

        commit({ saturation: nextSaturation, lightness: nextLightness });
      },
      [hue, commit],
    );

    const backgroundGradient = useMemo(() => {
      return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`;
    }, [hue]);

    const handlePointerMove = useCallback(
      (event: PointerEvent) => {
        if (!containerRef.current) {
          return;
        }
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left) / rect.width),
        );
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - rect.top) / rect.height),
        );

        commitFromPosition(x, y);
      },
      [commitFromPosition],
    );

    useEffect(() => {
      const handlePointerUp = () => setIsDragging(false);

      if (isDragging) {
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
      }

      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }, [isDragging, handlePointerMove]);

    return (
      <div
        aria-label="Color saturation and lightness"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(saturation)}
        aria-valuetext={`Saturation ${Math.round(saturation)}%, Lightness ${Math.round(lightness)}%`}
        className={cn(
          "relative size-full cursor-crosshair rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className,
        )}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          handlePointerMove(e.nativeEvent);
        }}
        ref={containerRef}
        role="slider"
        style={{
          background: backgroundGradient,
        }}
        tabIndex={0}
        {...props}
      >
        <div
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white"
          style={{
            left: `${positionX * 100}%`,
            top: `${positionY * 100}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          }}
        />
      </div>
    );
  },
);

ColorPickerSelection.displayName = "ColorPickerSelection";

export type ColorPickerHueProps = Omit<
  Slider.Root.Props<number>,
  "max" | "onValueChange" | "step" | "value"
>;

export const ColorPickerHue = ({
  className,
  ...props
}: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker();

  return (
    <Slider.Root
      className={cn("relative flex h-4 w-full touch-none", className)}
      max={360}
      onValueChange={setHue}
      step={1}
      value={hue}
      {...props}
    >
      <Slider.Control className="relative flex h-full w-full touch-none items-center">
        <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
          <Slider.Indicator className="absolute h-full" />
          <Slider.Thumb
            aria-label="Hue"
            className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-disabled:pointer-events-none data-disabled:opacity-50"
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
};

export type ColorPickerAlphaProps = Omit<
  Slider.Root.Props<number>,
  "max" | "onValueChange" | "step" | "value"
>;

export const ColorPickerAlpha = ({
  className,
  ...props
}: ColorPickerAlphaProps) => {
  const { alpha, setAlpha, hue, saturation, lightness } = useColorPicker();

  return (
    <Slider.Root
      className={cn("relative flex h-4 w-full touch-none", className)}
      max={100}
      onValueChange={setAlpha}
      step={1}
      value={alpha}
      {...props}
    >
      <Slider.Control className="relative flex h-full w-full touch-none items-center">
        <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] bg-center bg-repeat-x dark:bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALklEQVR4nGP8+vWrCAMewM3N/QafPBM+SWLAqAGDwQBGQgoIpZOB98KoAVQwAADxzQcSVIRCfQAAAABJRU5ErkJggg==')]">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, hsl(${hue}, ${saturation}%, ${lightness}%))`,
            }}
          />
          <Slider.Indicator className="absolute h-full rounded-full bg-transparent" />
          <Slider.Thumb
            aria-label="Opacity"
            className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-disabled:pointer-events-none data-disabled:opacity-50"
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({
  className,
  onClick,
  ...props
}: ColorPickerEyeDropperProps) => {
  const { commit } = useColorPicker();
  const isSupported = useSyncExternalStore(
    emptySubscribe,
    () => "EyeDropper" in window,
    () => false,
  );

  const handleEyeDropper = async () => {
    try {
      // @ts-expect-error - EyeDropper API is experimental
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const color = Color(result.sRGBHex);
      const [h = 0, s = 0, l = 0] = color.hsl().array();

      commit({ hue: h, saturation: s, lightness: l, alpha: 100 });
    } catch (error) {
      console.error("EyeDropper failed:", error);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      aria-label="Pick a color from the screen"
      className={cn("shrink-0 text-muted-foreground", className)}
      size="icon"
      type="button"
      variant="outline"
      {...props}
      onClick={(event) => {
        onClick?.(event);
        handleEyeDropper();
      }}
    >
      <HugeiconsIcon icon={ColorPickerIcon} size={16} />
    </Button>
  );
};

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

const formats = ["hex", "rgb", "css", "hsl"];
const emptySubscribe = () => () => {
  return;
};
const rgbChannels = ["r", "g", "b"];
const hslChannels = ["h", "s", "l"];

export const ColorPickerOutput = ({
  className,
  ...props
}: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select
      onValueChange={(nextMode) => {
        if (nextMode) {
          setMode(nextMode);
        }
      }}
      value={mode}
    >
      <SelectTrigger
        className={cn("h-8 w-20 shrink-0 text-xs", className)}
        {...props}
      >
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem className="text-xs" key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const HexInput = () => {
  const { hue, saturation, lightness, commit } = useColorPicker();
  const hex = Color.hsl(hue, saturation, lightness).hex();
  const [draft, setDraft] = useState(hex);
  const [editing, setEditing] = useState(false);

  const commitDraft = (value: string) => {
    const normalized = value.startsWith("#") ? value : `#${value}`;
    try {
      const color = Color(normalized);
      commit({
        hue: color.hue(),
        saturation: color.saturationl(),
        lightness: color.lightness(),
      });
    } catch {
      // Ignore unparseable drafts and fall back to the current color.
    }
  };

  return (
    <Input
      className="h-8 bg-secondary px-2 text-xs shadow-none"
      onBlur={() => setEditing(false)}
      onChange={(event) => {
        setDraft(event.target.value);
        commitDraft(event.target.value);
      }}
      onFocus={() => {
        setDraft(hex);
        setEditing(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      type="text"
      value={editing ? draft : hex}
    />
  );
};

type PercentageInputProps = ComponentProps<typeof Input>;

const PercentageInput = ({ className, ...props }: PercentageInputProps) => {
  const { alpha, commit } = useColorPicker();
  const [draft, setDraft] = useState(String(Math.round(alpha)));
  const [editing, setEditing] = useState(false);

  const apply = () => {
    setEditing(false);
    const parsed = Number.parseFloat(draft);
    if (!Number.isNaN(parsed)) {
      commit({ alpha: Math.min(100, Math.max(0, parsed)) });
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        {...props}
        className={cn(
          "h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 text-xs shadow-none",
          className,
        )}
        onBlur={apply}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => {
          setDraft(String(Math.round(alpha)));
          setEditing(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        value={editing ? draft : String(Math.round(alpha))}
      />
      <span className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground text-xs">
        %
      </span>
    </div>
  );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({
  className,
  ...props
}: ColorPickerFormatProps) => {
  const { hue, saturation, lightness, alpha, mode } = useColorPicker();
  const color = Color.hsl(hue, saturation, lightness, alpha / 100);

  if (mode === "hex") {
    return (
      <div
        className={cn(
          "-space-x-px relative flex w-full items-center rounded-md shadow-sm",
          className,
        )}
        {...props}
      >
        <HexInput />
      </div>
    );
  }

  if (mode === "rgb") {
    const rgb = color
      .rgb()
      .array()
      .map((value) => Math.round(value));

    return (
      <div
        className={cn(
          "-space-x-px flex items-center rounded-md shadow-sm",
          className,
        )}
        {...props}
      >
        {rgb.map((value, index) => (
          <Input
            className={cn(
              "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index && "rounded-l-none",
            )}
            key={rgbChannels[index]}
            readOnly
            type="text"
            value={value}
          />
        ))}
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === "css") {
    const rgb = color
      .rgb()
      .array()
      .map((value) => Math.round(value));

    return (
      <div className={cn("w-full rounded-md shadow-sm", className)} {...props}>
        <Input
          className="h-8 w-full bg-secondary px-2 text-xs shadow-none"
          readOnly
          type="text"
          value={`rgba(${rgb.join(", ")}, ${alpha}%)`}
        />
      </div>
    );
  }

  if (mode === "hsl") {
    const hsl = color
      .hsl()
      .array()
      .map((value) => Math.round(value));

    return (
      <div
        className={cn(
          "-space-x-px flex items-center rounded-md shadow-sm",
          className,
        )}
        {...props}
      >
        {hsl.map((value, index) => (
          <Input
            className={cn(
              "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index && "rounded-l-none",
            )}
            key={hslChannels[index]}
            readOnly
            type="text"
            value={value}
          />
        ))}
        <PercentageInput value={alpha} />
      </div>
    );
  }

  return null;
};
