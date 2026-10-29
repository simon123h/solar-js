/** Initial velocity arrangement for bodies in the n-body universe. */
export type NBodyVelocityArrangement = "stationary" | "circular" | "inward" | "outward" | "random";

/** Configuration options for the N-body universe. */
export interface NBodyOptions {
  /** Number of bodies in the simulation. */
  bodies: number;
  /** Velocity pattern / arrangement applied to initial bodies. */
  velocity_arrangement: NBodyVelocityArrangement;
  /** Scaling multiplier for the initial velocities (1.0 is default baseline). */
  velocity_scale: number;
  /** Whether bodies have varied random masses or equal masses. */
  varied_masses?: boolean;
}

/** Settings for the N-body scenario. */
export interface NBodySettings {
  /** Number of bodies. */
  bodies: number;
  /** Initial velocity arrangement. */
  velocity_arrangement: NBodyVelocityArrangement;
  /** Scaling multiplier for the initial velocities. */
  velocity_scale: number;
  /** Varied body masses. */
  varied_masses: boolean;
}

/** The body count choices offered by the panel. */
export const N_BODY_COUNTS = [50, 100, 200, 400, 800, 1200];

/** Velocity scaling range for the slider. */
export const N_BODY_VELOCITY_SCALE_RANGE = { min: 0.1, max: 5.0, step: 0.1 };

/** Velocity arrangement options with human-readable labels. */
export const N_BODY_VELOCITY_OPTIONS: { id: NBodyVelocityArrangement; label: string }[] = [
  { id: "stationary", label: "Stationary (zero velocity)" },
  { id: "circular", label: "Swirling / Circular rotation" },
  { id: "inward", label: "Inward collapse" },
  { id: "outward", label: "Outward explosion" },
  { id: "random", label: "Random velocities" },
];

/** Default settings for N-body scenario. */
export const DEFAULT_N_BODY_SETTINGS: NBodySettings = {
  bodies: 400,
  velocity_arrangement: "stationary",
  velocity_scale: 1.0,
  varied_masses: false,
};

/** Normalizes N-body settings loaded from storage or user input. */
export function normalize_n_body_settings(value: unknown): NBodySettings {
  const saved = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const defaults = DEFAULT_N_BODY_SETTINGS;
  const bodies =
    typeof saved.bodies === "number" && Number.isFinite(saved.bodies) && saved.bodies >= 2 && saved.bodies <= 5000
      ? Math.round(saved.bodies)
      : defaults.bodies;
  const valid_arrangements: NBodyVelocityArrangement[] = ["stationary", "circular", "inward", "outward", "random"];
  const velocity_arrangement = valid_arrangements.includes(saved.velocity_arrangement as NBodyVelocityArrangement)
    ? (saved.velocity_arrangement as NBodyVelocityArrangement)
    : defaults.velocity_arrangement;
  const velocity_scale =
    typeof saved.velocity_scale === "number" &&
    Number.isFinite(saved.velocity_scale) &&
    saved.velocity_scale >= 0 &&
    saved.velocity_scale <= 20
      ? Math.round(saved.velocity_scale * 100) / 100
      : defaults.velocity_scale;
  const varied_masses = typeof saved.varied_masses === "boolean" ? saved.varied_masses : defaults.varied_masses;
  return {
    bodies,
    velocity_arrangement,
    velocity_scale,
    varied_masses,
  };
}

/** Converts N-body settings to universe options. */
export function n_body_options(settings: NBodySettings): NBodyOptions {
  return normalize_n_body_settings(settings);
}
