import { HaloSpec, Universe } from "../universe";

/** Number of spiral arms of each galaxy. */
const ARMS = 2;

/** How tightly the arms wind: the angle gained per e-fold in radius (1 / tan of a ~20 degree pitch angle). */
const WINDING = 2.75;

/** Radius of the innermost orbit, where the arms start. */
const INNER_RADIUS = 0.2e11;

/** Angular spread of the stars around the center line of an arm, in radians. */
const ARM_SPREAD = 0.3;

/**
 * Picks the angle at which to place a star so that stars gather along logarithmic spiral arms.
 * The arms trail behind the direction of rotation, like in real spiral galaxies.
 * @param radius - The orbit radius of the star.
 * @param random - Source of randomness.
 * @returns The angle in radians.
 */
export function spiral_angle(radius: number, random: () => number): number {
  const arm = Math.floor(random() * ARMS);
  // the sum of three uniform numbers is roughly bell-shaped, with a standard deviation of 0.5
  const scatter = random() + random() + random() - 1.5;
  return (arm * 2 * Math.PI) / ARMS + WINDING * Math.log(radius / INNER_RADIUS) + 2 * ARM_SPREAD * scatter;
}

/**
 * The dark matter halo of each galaxy in the variant with halos. It flattens the rotation curve of the
 * disk, so the stars orbit at more similar speeds, and keeps the galaxies' encounter close to the original.
 */
export const GALAXY_HALO: HaloSpec = {
  v0: 4.5e4,
  core_radius: 2e10,
  truncation_radius: 2e11,
};

/**
 * The core radius of each galaxy's central mass in the variant with bulges. Together with the halo this gives
 * a rotation curve that rises through the bulge and stays flat outside it, as in real spiral galaxies.
 */
export const GALAXY_BULGE_RADIUS = 3e10;

/** Optional features of the galaxy collision. */
export interface GalaxyOptions {
  /** If given, both galaxies get a dark matter halo with these parameters; none by default. */
  halo?: HaloSpec | null;
  /** The core radius of each galaxy's central mass in meters; 0 (the default) makes it a point mass. */
  bulge_radius?: number;
}

/**
 * Creates a galaxy collision universe.
 * @param random - Source of randomness, e.g. a seeded generator for a reproducible scene.
 * @param options - Optional features such as dark matter halos.
 * @returns The created Universe instance configured with two colliding galaxies.
 */
export default function createGalaxyCollision(random: () => number = Math.random, options: GalaxyOptions = {}): Universe {
  const { halo = null, bulge_radius = 0 } = options;
  const universe = new Universe();
  universe.random = random;
  universe.physics.G = 6.674e-11;
  universe.physics.length_scale = 1e9;
  // Softening acts as the core size of each galaxy (together with the bulge radius, if there is one).
  // It must stay large enough for the time step to resolve a pass through the core; smaller values
  // make close encounters numerically violent.
  universe.physics.softening = 6e9;
  universe.physics.dt = 60 * 60 * 3;
  universe.physics.trace_age = 60 * 60 * 24 * 400;
  universe.physics.substeps = 3;
  universe.physics.n_asteroids = 500;

  const milkyway = {
    name: "Milky Way",
    core_radius: bulge_radius,
    color: "#6ff",
    mass: 2e30,
    radius: 5,
    x: -300e9,
    y: 0,
    vx: 0,
    vy: 4e3,
  };

  const andromeda = {
    name: "Andromeda Galaxy",
    core_radius: bulge_radius,
    color: "#ff6",
    mass: 4e30,
    radius: 5,
    x: 300e9,
    y: 0,
    vx: -2e3,
    vy: -4e3,
  };

  const [mw, ag] = universe.generate_planets([milkyway, andromeda]);
  if (halo) {
    // before the stars are placed, so that their orbital speeds include the halo
    for (const galaxy of [mw, ag]) universe.add_halo(galaxy, halo.v0, halo.core_radius, halo.truncation_radius);
  }

  for (let n = 0; n < universe.physics.n_asteroids!; n++) {
    // highlight the earth: the first body of the Milky Way is a full, non-dummy planet
    const is_earth = n === 0;
    const planet = {
      name: is_earth ? "Earth" : "MW" + n,
      color: is_earth ? "#0077ff" : "#CCF",
      mass: 1e15,
      radius: is_earth ? 2 : 1,
      shadow: 6,
      is_dummy: !is_earth,
    };
    const radius = 1e11 * (0.2 + universe.random());
    universe.circularize(universe.generate_planets([planet])[0], radius, mw, 0.9, spiral_angle(radius, universe.random));
  }

  for (let n = 0; n < universe.physics.n_asteroids!; n++) {
    const planet = {
      name: "AG" + n,
      color: "#FFC",
      mass: 1e15,
      radius: 1,
      shadow: 6,
      is_dummy: true,
    };
    const radius = 1e11 * (0.2 + universe.random());
    universe.circularize(universe.generate_planets([planet])[0], radius, ag, 0.9, spiral_angle(radius, universe.random));
  }

  return universe;
}
