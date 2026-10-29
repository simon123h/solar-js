import { Planet } from "../planet";
import { HaloSpec, PlanetSpec, Universe } from "../universe";
import { Units } from "../units";

/** Number of spiral arms of each galaxy. */
const ARMS = 2;

/** How tightly the arms wind: the angle gained per e-fold in radius (1 / tan of a ~20 degree pitch angle). */
const WINDING = 2.75;

/** Radius of the innermost orbit, where the arms start. */
const INNER_RADIUS = 0.2e11;

/** Angular spread of the stars around the center line of an arm, in radians. */
const ARM_SPREAD = 0.3;

/** The scale length of the exponential disks: the surface density falls by a factor e over this distance. */
const DISK_SCALE_LENGTH = 0.35e11;

/** The innermost and outermost orbit radius of the stars. */
const DISK_MIN_RADIUS = 0.02e11;
const DISK_MAX_RADIUS = 1.6e11;

/**
 * Picks an orbit radius for a star in an exponential disk, whose surface density falls off as exp(-r / scale).
 * The number of stars within a radius r is then proportional to 1 - (1 + r / scale) * exp(-r / scale), which is
 * inverted here for a random number.
 * @param random - Source of randomness.
 * @param scale - The scale length of the disk.
 * @param min_radius - The innermost radius.
 * @param max_radius - The outermost radius.
 * @returns A radius between the two limits.
 */
export function exponential_disk_radius(random: () => number, scale: number, min_radius: number, max_radius: number): number {
  const cumulative = (r: number) => 1 - (1 + r / scale) * Math.exp(-r / scale);
  const lowest = cumulative(min_radius);
  const target = lowest + random() * (cumulative(max_radius) - lowest);
  // the cumulative distribution increases monotonically, so bisection converges
  let low = min_radius;
  let high = max_radius;
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2;
    if (cumulative(middle) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/**
 * Picks the angle at which to place a star so that stars gather along logarithmic spiral arms.
 * The arms trail behind the direction of rotation, like in real spiral galaxies.
 * @param radius - The orbit radius of the star.
 * @param random - Source of randomness.
 * @param spin - The direction of rotation: 1 (the default) is counter-clockwise on screen, -1 is clockwise.
 * @returns The angle in radians.
 */
export function spiral_angle(radius: number, random: () => number, spin: number = 1): number {
  const arm = Math.floor(random() * ARMS);
  // the sum of three uniform numbers is roughly bell-shaped, with a standard deviation of 0.5
  const scatter = random() + random() + random() - 1.5;
  // rotating the other way mirrors the arms, so they still trail
  return (arm * 2 * Math.PI) / ARMS + spin * WINDING * Math.log(radius / INNER_RADIUS) + 2 * ARM_SPREAD * scatter;
}

/**
 * Gives a star on a circular orbit a random velocity, like the random motions of real stars in a disk.
 * @param planet - The star, already placed on a circular orbit around the galaxy.
 * @param galaxy - The galaxy the star orbits.
 * @param fraction - The standard deviation of each velocity component, as a fraction of the orbital speed.
 * @param random - Source of randomness.
 */
export function add_velocity_dispersion(planet: Planet, galaxy: Planet, fraction: number, random: () => number): void {
  const sigma = fraction * Math.hypot(planet.vx - galaxy.vx, planet.vy - galaxy.vy);
  // the sum of three uniform numbers, scaled to a standard deviation of 1, is roughly Gaussian
  const gaussian = () => 2 * (random() + random() + random() - 1.5);
  planet.vx += sigma * gaussian();
  planet.vy += sigma * gaussian();
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

const METERS_PER_KPC = 3.0857e19;
const SECONDS_PER_MYR = 3.15576e13;

/**
 * The real-world scale the galaxy collision stands for. The scene is calibrated by two choices: the disks
 * are about 12 kpc in radius (10^10 simulated meters per kpc), and the halo's flat rotation speed of 45 km/s
 * stands for a real galaxy's 220 km/s. A length scale and a speed scale fix the time scale, so a simulated
 * 14 hours is 1 Myr and the whole encounter takes a few hundred Myr, as real ones do.
 */
export const GALAXY_UNITS: Units = (() => {
  const meters_per_kpc = 1e10;
  const length_factor = METERS_PER_KPC / meters_per_kpc;
  const speed_factor = 220e3 / GALAXY_HALO.v0;
  const time_factor = length_factor / speed_factor;
  return {
    time_unit: "Myr",
    seconds_per_time_unit: SECONDS_PER_MYR / time_factor,
    length_unit: "kpc",
    meters_per_length_unit: meters_per_kpc,
  };
})();

/** Optional features of the galaxy collision. */
export interface GalaxyOptions {
  /** If given, both galaxies get a dark matter halo with these parameters; none by default. */
  halo?: HaloSpec | null;
  /** The core radius of each galaxy's central mass in meters; 0 (the default) makes it a point mass. */
  bulge_radius?: number;
  /** The random velocity of the stars as a fraction of their orbital speed; 0.1 by default. */
  dispersion?: number;
  /**
   * The direction in which the Milky Way and the Andromeda Galaxy rotate: 1 is counter-clockwise on screen,
   * -1 clockwise. The galaxies approach each other counter-clockwise, so 1 is prograde (spin along the
   * orbit, which gives strong tidal tails) and -1 retrograde. Both are prograde by default.
   */
  spins?: [number, number];
  /**
   * Whether the galaxies are slowed by dynamical friction as they move through each other's halo, which makes
   * them lose orbital energy and merge. Needs halos; off by default.
   */
  friction?: boolean;
  /** The number of stars in each galaxy; 3000 by default. */
  stars?: number;
}

/**
 * Creates a galaxy collision universe.
 * @param random - Source of randomness, e.g. a seeded generator for a reproducible scene.
 * @param options - Optional features such as dark matter halos.
 * @returns The created Universe instance configured with two colliding galaxies.
 */
export default function createGalaxyCollision(random: () => number = Math.random, options: GalaxyOptions = {}): Universe {
  const { halo = null, bulge_radius = 0, dispersion = 0.1, spins = [1, 1], friction = false, stars = 3000 } = options;
  const universe = new Universe();
  universe.random = random;
  universe.units = GALAXY_UNITS;
  universe.physics.G = 6.674e-11;
  universe.physics.length_scale = 1e9;
  // Softening acts as the core size of each galaxy (together with the bulge radius, if there is one).
  // It must stay large enough for the time step to resolve a pass through the core; smaller values
  // make close encounters numerically violent.
  universe.physics.softening = 6e9;
  universe.physics.dt = 60 * 60 * 3;
  universe.physics.trace_age = 60 * 60 * 24 * 400;
  universe.physics.substeps = 3;
  universe.physics.n_asteroids = stars;

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
    for (const galaxy of [mw, ag]) universe.add_halo(galaxy, halo.v0, halo.core_radius, halo.truncation_radius, friction);
  }

  /** Adds a star on an orbit inside a spiral arm of the galaxy, with some random motion. */
  const add_star = (spec: PlanetSpec, radius: number, galaxy: Planet, spin: number): void => {
    const star = universe.generate_planets([spec])[0];
    universe.circularize(star, radius, galaxy, spin, spiral_angle(radius, universe.random, spin));
    add_velocity_dispersion(star, galaxy, dispersion, universe.random);
  };

  for (let n = 0; n < universe.physics.n_asteroids!; n++) {
    // highlight the earth: the first body of the Milky Way is a full, non-dummy planet
    const is_earth = n === 0;
    const planet = {
      name: is_earth ? "Earth" : "MW" + n,
      color: is_earth ? "#0077ff" : "#CCF",
      mass: 1e15,
      radius: is_earth ? 2 : 1,
      shadow: is_earth ? 6 : undefined,
      is_dummy: !is_earth,
    };
    const radius = exponential_disk_radius(universe.random, DISK_SCALE_LENGTH, DISK_MIN_RADIUS, DISK_MAX_RADIUS);
    add_star(planet, radius, mw, spins[0]);
  }

  for (let n = 0; n < universe.physics.n_asteroids!; n++) {
    const planet = {
      name: "AG" + n,
      color: "#FFC",
      mass: 1e15,
      radius: 1,
      is_dummy: true,
    };
    const radius = exponential_disk_radius(universe.random, DISK_SCALE_LENGTH, DISK_MIN_RADIUS, DISK_MAX_RADIUS);
    add_star(planet, radius, ag, spins[1]);
  }

  return universe;
}
