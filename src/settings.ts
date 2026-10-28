/** The control pane settings that persist between visits. */
export interface Settings {
  universe: string;
  speed: number;
}

/** The part of the Storage interface the settings need. */
export type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

/** The localStorage key the settings are stored under. */
export const SETTINGS_KEY = "solarjs.settings";

/**
 * Returns the browser's localStorage, or null if it is unavailable (e.g. blocked by the browser).
 */
export function get_local_storage(): SettingsStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Loads the saved settings. Anything missing, corrupt or no longer valid falls back to the defaults.
 * @param storage - Where the settings are stored, or null if there is no storage.
 * @param defaults - The settings to use for everything that was not saved.
 * @param is_valid - Checks a loaded value, so options that no longer exist are ignored.
 * @returns The settings to use.
 */
export function load_settings(
  storage: SettingsStorage | null,
  defaults: Settings,
  is_valid: { universe: (value: string) => boolean; speed: (value: number) => boolean },
): Settings {
  const settings = { ...defaults };
  try {
    const saved = JSON.parse(storage?.getItem(SETTINGS_KEY) ?? "null");
    if (typeof saved?.universe === "string" && is_valid.universe(saved.universe)) settings.universe = saved.universe;
    if (typeof saved?.speed === "number" && is_valid.speed(saved.speed)) settings.speed = saved.speed;
  } catch {
    // unreadable storage or corrupt JSON: keep the defaults
  }
  return settings;
}

/**
 * Saves the settings. Failures (storage full or blocked) are ignored, since persistence is optional.
 * @param storage - Where to store the settings, or null if there is no storage.
 * @param settings - The settings to save.
 */
export function save_settings(storage: SettingsStorage | null, settings: Settings): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
