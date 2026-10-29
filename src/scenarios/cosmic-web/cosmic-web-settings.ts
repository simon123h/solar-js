/** Options configuring the cosmic web simulation. */
export interface CosmicWebOptions {
  /** Number of mass particles simulating dark matter filaments. */
  particles: number;
  /** Perturbation roughness/scale (number of Fourier perturbation waves). */
  roughness: number;
  /** Initial perturbation displacement amplitude (0.0 to 1.0). */
  perturbation_amplitude: number;
  /** Expansion factor balancing initial cosmic Hubble flow vs collapse (-0.5 to 1.5). */
  expansion: number;
}

/** Settings for the cosmic web scenario. */
export interface CosmicWebSettings {
  /** Number of particles. */
  particles: number;
  /** Roughness (Fourier wave count). */
  roughness: number;
  /** Perturbation amplitude. */
  perturbation_amplitude: number;
  /** Cosmic expansion factor. */
  expansion: number;
}

/** Available choices for particle count in the cosmic web scenario. */
export const COSMIC_WEB_PARTICLE_COUNTS = [225, 400, 625, 900, 1225];

/** Ranges for sliders in cosmic web settings panel. */
export const COSMIC_WEB_ROUGHNESS_RANGE = { min: 2, max: 12, step: 1 };
export const COSMIC_WEB_AMPLITUDE_RANGE = { min: 0.1, max: 0.8, step: 0.05 };
export const COSMIC_WEB_EXPANSION_RANGE = { min: -0.2, max: 1.2, step: 0.1 };

/** Default settings for the cosmic web scenario. */
export const DEFAULT_COSMIC_WEB_SETTINGS: CosmicWebSettings = {
  particles: 625,
  roughness: 6,
  perturbation_amplitude: 0.4,
  expansion: 0.2,
};

/** Normalizes loaded or user-provided cosmic web settings. */
export function normalize_cosmic_web_settings(value: unknown): CosmicWebSettings {
  const saved = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const defaults = DEFAULT_COSMIC_WEB_SETTINGS;

  const particles =
    typeof saved.particles === "number" && Number.isFinite(saved.particles) && saved.particles >= 50 && saved.particles <= 2500
      ? Math.round(saved.particles)
      : defaults.particles;

  const roughness =
    typeof saved.roughness === "number" &&
    Number.isFinite(saved.roughness) &&
    saved.roughness >= COSMIC_WEB_ROUGHNESS_RANGE.min &&
    saved.roughness <= COSMIC_WEB_ROUGHNESS_RANGE.max
      ? Math.round(saved.roughness)
      : defaults.roughness;

  const perturbation_amplitude =
    typeof saved.perturbation_amplitude === "number" &&
    Number.isFinite(saved.perturbation_amplitude) &&
    saved.perturbation_amplitude >= COSMIC_WEB_AMPLITUDE_RANGE.min &&
    saved.perturbation_amplitude <= COSMIC_WEB_AMPLITUDE_RANGE.max
      ? Math.round(saved.perturbation_amplitude * 100) / 100
      : defaults.perturbation_amplitude;

  const expansion =
    typeof saved.expansion === "number" &&
    Number.isFinite(saved.expansion) &&
    saved.expansion >= COSMIC_WEB_EXPANSION_RANGE.min &&
    saved.expansion <= COSMIC_WEB_EXPANSION_RANGE.max
      ? Math.round(saved.expansion * 100) / 100
      : defaults.expansion;

  return {
    particles,
    roughness,
    perturbation_amplitude,
    expansion,
  };
}

/** Converts cosmic web settings to universe options. */
export function cosmic_web_options(settings: CosmicWebSettings): CosmicWebOptions {
  return normalize_cosmic_web_settings(settings);
}
