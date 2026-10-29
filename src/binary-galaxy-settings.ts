/** Options configuring the binary black hole galaxy simulation. */
export interface BinaryGalaxyOptions {
  /** Separation between the two central black holes in meters or kpc units. */
  separation_kpc: number;
  /** Mass ratio between the secondary and primary black hole (0.1 to 1.0). */
  mass_ratio: number;
  /** Total number of disk stars. */
  stars: number;
  /** Whether the galaxy includes a dark matter halo. */
  halo: boolean;
}

/** Settings for the binary galaxy scenario. */
export interface BinaryGalaxySettings {
  /** Separation of the binary black holes in kpc. */
  separation_kpc: number;
  /** Mass ratio (0.1 to 1.0). */
  mass_ratio: number;
  /** Number of stars in the galactic disk. */
  stars: number;
  /** Dark matter halo toggle. */
  halo: boolean;
}

/** Choices for star count in the binary black hole galaxy scenario. */
export const BINARY_GALAXY_STAR_COUNTS = [1000, 2000, 3000, 4500, 6000];

/** Ranges for sliders. */
export const BINARY_GALAXY_SEPARATION_RANGE = { min: 0.5, max: 15.0, step: 0.5 };
export const BINARY_GALAXY_MASS_RATIO_RANGE = { min: 0.2, max: 1.0, step: 0.1 };

/** Default settings for binary black hole galaxy. */
export const DEFAULT_BINARY_GALAXY_SETTINGS: BinaryGalaxySettings = {
  separation_kpc: 4.0,
  mass_ratio: 0.8,
  stars: 3000,
  halo: true,
};

/** Normalizes loaded or user-provided binary galaxy settings. */
export function normalize_binary_galaxy_settings(value: unknown): BinaryGalaxySettings {
  const saved = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const defaults = DEFAULT_BINARY_GALAXY_SETTINGS;

  const separation_kpc =
    typeof saved.separation_kpc === "number" &&
    Number.isFinite(saved.separation_kpc) &&
    saved.separation_kpc >= BINARY_GALAXY_SEPARATION_RANGE.min &&
    saved.separation_kpc <= BINARY_GALAXY_SEPARATION_RANGE.max
      ? Math.round(saved.separation_kpc * 10) / 10
      : defaults.separation_kpc;

  const mass_ratio =
    typeof saved.mass_ratio === "number" &&
    Number.isFinite(saved.mass_ratio) &&
    saved.mass_ratio >= BINARY_GALAXY_MASS_RATIO_RANGE.min &&
    saved.mass_ratio <= BINARY_GALAXY_MASS_RATIO_RANGE.max
      ? Math.round(saved.mass_ratio * 10) / 10
      : defaults.mass_ratio;

  const stars =
    typeof saved.stars === "number" && Number.isFinite(saved.stars) && saved.stars >= 100 && saved.stars <= 10000
      ? Math.round(saved.stars)
      : defaults.stars;

  const halo = typeof saved.halo === "boolean" ? saved.halo : defaults.halo;

  return {
    separation_kpc,
    mass_ratio,
    stars,
    halo,
  };
}

/** Converts binary galaxy settings to options. */
export function binary_galaxy_options(settings: BinaryGalaxySettings): BinaryGalaxyOptions {
  return normalize_binary_galaxy_settings(settings);
}
