import {
  DEFAULT_GALAXY_SETTINGS,
  GalaxySettings,
  LEGACY_GALAXY_UNIVERSES,
  normalize_galaxy_settings,
} from "../scenarios/galaxy-collision";
import { DEFAULT_SOLAR_SETTINGS, SolarSystemSettings, normalize_solar_settings } from "../scenarios/solar-system";
import { DEFAULT_N_BODY_SETTINGS, NBodySettings, normalize_n_body_settings } from "../scenarios/n-body";
import { DEFAULT_COSMIC_WEB_SETTINGS, CosmicWebSettings, normalize_cosmic_web_settings } from "../scenarios/cosmic-web";
import {
  DEFAULT_BINARY_GALAXY_SETTINGS,
  BinaryGalaxySettings,
  normalize_binary_galaxy_settings,
} from "../scenarios/binary-galaxy";

/** The control pane settings that persist between visits. */
export interface Settings {
  universe: string;
  speed: number;
  /** The settings of the galaxy collision, which are kept even while another universe is shown. */
  galaxy: GalaxySettings;
  /** The settings of the solar system scenario. */
  solar: SolarSystemSettings;
  /** The settings of the generic n-body simulation scenario. */
  nbody: NBodySettings;
  /** The settings of the cosmic web structure formation scenario. */
  cosmic: CosmicWebSettings;
  /** The settings of the binary black hole galaxy scenario. */
  binary: BinaryGalaxySettings;
}

/** The settings to start with, before anything has been saved. */
export const DEFAULT_SETTINGS: Settings = {
  universe: "solar-system",
  speed: 1,
  galaxy: DEFAULT_GALAXY_SETTINGS,
  solar: DEFAULT_SOLAR_SETTINGS,
  nbody: DEFAULT_N_BODY_SETTINGS,
  cosmic: DEFAULT_COSMIC_WEB_SETTINGS,
  binary: DEFAULT_BINARY_GALAXY_SETTINGS,
};

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
 * Loads the saved settings. Anything missing, corrupt or no longer valid falls back to the defaults. The galaxy
 * collision used to be several universes; if one of those was saved, the merged universe is chosen with the
 * settings that reproduce it.
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
    const legacy = typeof saved?.universe === "string" && Object.prototype.hasOwnProperty.call(LEGACY_GALAXY_UNIVERSES, saved.universe);
    if (legacy) {
      if (is_valid.universe("galaxy-collision")) settings.universe = "galaxy-collision";
      settings.galaxy = LEGACY_GALAXY_UNIVERSES[saved.universe];
    } else if (typeof saved?.universe === "string" && is_valid.universe(saved.universe)) {
      settings.universe = saved.universe;
    }
    if (typeof saved?.speed === "number" && is_valid.speed(saved.speed)) settings.speed = saved.speed;
    if (saved?.galaxy !== undefined) settings.galaxy = normalize_galaxy_settings(saved.galaxy);
    if (saved?.solar !== undefined) settings.solar = normalize_solar_settings(saved.solar);
    if (saved?.nbody !== undefined) settings.nbody = normalize_n_body_settings(saved.nbody);
    if (saved?.cosmic !== undefined) settings.cosmic = normalize_cosmic_web_settings(saved.cosmic);
    if (saved?.binary !== undefined) settings.binary = normalize_binary_galaxy_settings(saved.binary);
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
