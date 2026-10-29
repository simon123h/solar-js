/** Configuration options for the solar system simulation. */
export interface SolarSystemOptions {
  /** Number of asteroids in the asteroid belt. */
  asteroids: number;
  /** Whether Pluto is included in the simulation. */
  include_pluto: boolean;
}

/** Settings for the solar system scenario that can be changed by the user. */
export interface SolarSystemSettings {
  /** Number of asteroids in the asteroid belt. */
  asteroids: number;
  /** Whether Pluto is included. */
  include_pluto: boolean;
}

/** Number of asteroids options offered by the panel. */
export const SOLAR_ASTEROID_COUNTS = [0, 100, 200, 400, 800, 1500];

/** Default settings for the solar system. */
export const DEFAULT_SOLAR_SETTINGS: SolarSystemSettings = {
  asteroids: 400,
  include_pluto: true,
};

/** Normalizes solar system settings loaded from storage or user input. */
export function normalize_solar_settings(value: unknown): SolarSystemSettings {
  const saved = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const defaults = DEFAULT_SOLAR_SETTINGS;
  const asteroids =
    typeof saved.asteroids === "number" && Number.isFinite(saved.asteroids) && saved.asteroids >= 0
      ? Math.round(saved.asteroids)
      : defaults.asteroids;
  const include_pluto = typeof saved.include_pluto === "boolean" ? saved.include_pluto : defaults.include_pluto;
  return {
    asteroids,
    include_pluto,
  };
}

/** Converts solar system settings to universe options. */
export function solar_options(settings: SolarSystemSettings): SolarSystemOptions {
  return normalize_solar_settings(settings);
}
