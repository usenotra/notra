import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { CACHE_DIR } from "../constants/paths";
import type { PickerSettings } from "../types/picker";
import { createPickerSettings } from "../utils/picker";

const SETTINGS_FILE = join(CACHE_DIR, "picker.json");

export async function loadPickerSettings(): Promise<PickerSettings> {
  try {
    return {
      ...createPickerSettings(),
      ...(JSON.parse(await readFile(SETTINGS_FILE, "utf8")) as PickerSettings),
    };
  } catch {
    return createPickerSettings();
  }
}

export async function savePickerSettings(
  settings: PickerSettings
): Promise<void> {
  await mkdir(dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
