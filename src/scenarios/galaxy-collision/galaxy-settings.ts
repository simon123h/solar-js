import { DEFAULT_SEPARATION } from "./encounter";
import { GALAXY_BULGE_RADIUS, GALAXY_ENCOUNTER, GALAXY_HALO, GALAXY_UNITS, GalaxyOptions } from "./galaxy-collision";

/** What the user can change about the galaxy collision. */
export interface GalaxySettings {
  /** Whether both galaxies have a dark matter halo. */
  halo: boolean;
  /** Whether the galaxies have an extended bulge instead of a point mass in the middle. */
  bulge: boolean;
  /** Whether dynamical friction slows the galaxies in each other's halo, so that they merge; needs halos. */
  friction: boolean;
  /** The rotation of the Milky Way and the Andromeda Galaxy: 1 is prograde, -1 retrograde. */
  spins: [number, number];
  /** Whether the encounter is described by the pericenter and eccentricity below, instead of the hand-picked fast pass. */
  custom_encounter: boolean;
  /** The distance of the first closest approach in kpc, for a custom encounter. */
  pericenter_kpc: number;
  /** The eccentricity of the equivalent Kepler orbit, for a custom encounter. */
  eccentricity: number;
  /** The number of stars in each galaxy. */
  stars: number;
}

/** The numbers of stars the panel offers. */
export const STAR_COUNTS = [500, 1000, 2000, 3000, 4500, 6000];

/** The range of the pericenter in kpc and of the eccentricity that the panel offers. */
export const PERICENTER_RANGE = { min: 2, max: 50, step: 1 };
export const ECCENTRICITY_RANGE = { min: 0.5, max: 2.5, step: 0.05 };

/** The pericenter of the encounter of the merger presets, in kpc. */
const MERGER_PERICENTER_KPC = GALAXY_ENCOUNTER.pericenter / GALAXY_UNITS.meters_per_length_unit;

/** The scene as it started out: two plain disks on a fast pass. */
export const DEFAULT_GALAXY_SETTINGS: GalaxySettings = {
  halo: false,
  bulge: false,
  friction: false,
  spins: [1, 1],
  custom_encounter: false,
  pericenter_kpc: MERGER_PERICENTER_KPC,
  eccentricity: GALAXY_ENCOUNTER.eccentricity,
  stars: 3000,
};

/** A named combination of settings. */
export interface GalaxyPreset {
  id: string;
  label: string;
  settings: GalaxySettings;
}

const MERGER: GalaxySettings = {
  ...DEFAULT_GALAXY_SETTINGS,
  halo: true,
  bulge: true,
  friction: true,
  custom_encounter: true,
};

/** The variations of the galaxy collision that used to be separate scenarios. */
export const GALAXY_PRESETS: GalaxyPreset[] = [
  { id: "classic", label: "Plain disks, fast pass", settings: DEFAULT_GALAXY_SETTINGS },
  { id: "halo", label: "With dark matter halos", settings: { ...DEFAULT_GALAXY_SETTINGS, halo: true } },
  { id: "merger", label: "Merger with halos and friction", settings: MERGER },
  { id: "retrograde", label: "Merger, retrograde disks", settings: { ...MERGER, spins: [-1, -1] } },
];

/**
 * The saved scenarios that used to be separate universes, and the settings that reproduce each of them.
 */
export const LEGACY_GALAXY_UNIVERSES: Record<string, GalaxySettings> = {
  "galaxy-collision-halo": GALAXY_PRESETS[1].settings,
  "galaxy-collision-realistic": GALAXY_PRESETS[2].settings,
  "galaxy-collision-retrograde": GALAXY_PRESETS[3].settings,
};

/**
 * Brings settings into a canonical form: friction needs halos, and the pericenter and eccentricity only matter
 * for a custom encounter. Equal scenes then have equal settings.
 */
function canonical(settings: GalaxySettings): GalaxySettings {
  return {
    ...settings,
    friction: settings.halo && settings.friction,
    pericenter_kpc: settings.custom_encounter ? settings.pericenter_kpc : DEFAULT_GALAXY_SETTINGS.pericenter_kpc,
    eccentricity: settings.custom_encounter ? settings.eccentricity : DEFAULT_GALAXY_SETTINGS.eccentricity,
  };
}

/**
 * Finds the preset that the settings are equal to.
 * @returns The id of the preset, or null if the settings are a custom combination.
 */
export function matching_preset(settings: GalaxySettings): string | null {
  const wanted = JSON.stringify(canonical(settings));
  return GALAXY_PRESETS.find((preset) => JSON.stringify(canonical(preset.settings)) === wanted)?.id ?? null;
}

/**
 * Converts the settings into the options of the scene.
 */
export function galaxy_options(settings: GalaxySettings): GalaxyOptions {
  const { halo, bulge, friction, spins, custom_encounter, pericenter_kpc, eccentricity, stars } = canonical(settings);
  return {
    halo: halo ? GALAXY_HALO : null,
    bulge_radius: bulge ? GALAXY_BULGE_RADIUS : 0,
    friction,
    spins,
    stars,
    encounter: custom_encounter ? { pericenter: pericenter_kpc * GALAXY_UNITS.meters_per_length_unit, eccentricity } : undefined,
  };
}

/**
 * How far out a bound orbit has to reach, relative to the starting distance. Exactly at the starting distance the
 * galaxies would have to start at the apocenter, and the halos make the real orbit differ from a Kepler one by
 * up to about 10%, so some room is needed for the starting speed to exist.
 */
const APOCENTER_MARGIN = 1.15;

/**
 * Explains why a custom encounter cannot be started, if so. A bound orbit (eccentricity below 1) only reaches
 * out as far as its apocenter, which has to be beyond the distance at which the galaxies start.
 * @returns A sentence for the user, or null if the encounter is possible.
 */
export function encounter_problem(settings: GalaxySettings): string | null {
  if (!settings.custom_encounter) return null;
  const separation = DEFAULT_SEPARATION / GALAXY_UNITS.meters_per_length_unit;
  const { pericenter_kpc: pericenter, eccentricity } = settings;
  if (pericenter >= separation) return `The pericenter has to be smaller than the ${separation} kpc at which the galaxies start.`;
  if (eccentricity < 1) {
    const farthest = (pericenter * (1 + eccentricity)) / (1 - eccentricity);
    if (farthest < APOCENTER_MARGIN * separation) {
      const reach = APOCENTER_MARGIN * separation;
      const needed = (reach - pericenter) / (reach + pericenter);
      return `This orbit only reaches out to ${farthest.toFixed(0)} kpc, but the galaxies start ${separation} kpc apart. It needs an eccentricity of at least ${(Math.ceil(needed * 100) / 100).toFixed(2)}.`;
    }
  }
  return null;
}

/** Returns the value if it is a number in the range, and the fallback otherwise. */
function number_in(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

/**
 * Makes settings from anything that was saved, using the default for every part that is missing or invalid.
 * @param value - The saved value, e.g. parsed from JSON.
 */
export function normalize_galaxy_settings(value: unknown): GalaxySettings {
  const saved = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const defaults = DEFAULT_GALAXY_SETTINGS;
  const flag = (key: "halo" | "bulge" | "friction" | "custom_encounter") =>
    typeof saved[key] === "boolean" ? (saved[key] as boolean) : defaults[key];
  const spin = (index: number) =>
    Array.isArray(saved.spins) && (saved.spins[index] === 1 || saved.spins[index] === -1) ? saved.spins[index] : 1;
  const stars = number_in(saved.stars, 0, 10000, defaults.stars);
  return canonical({
    halo: flag("halo"),
    bulge: flag("bulge"),
    friction: flag("friction"),
    spins: [spin(0), spin(1)],
    custom_encounter: flag("custom_encounter"),
    pericenter_kpc: number_in(saved.pericenter_kpc, PERICENTER_RANGE.min, PERICENTER_RANGE.max, defaults.pericenter_kpc),
    eccentricity: number_in(saved.eccentricity, ECCENTRICITY_RANGE.min, ECCENTRICITY_RANGE.max, defaults.eccentricity),
    stars: Number.isInteger(stars) ? stars : defaults.stars,
  });
}
