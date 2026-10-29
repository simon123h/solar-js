import { Universe } from "../universe";

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
 * Creates a galaxy collision universe.
 * @param random - Source of randomness, e.g. a seeded generator for a reproducible scene.
 * @returns The created Universe instance configured with two colliding galaxies.
 */
export default function createGalaxyCollision(random: () => number = Math.random): Universe {
  const universe = new Universe();
  universe.random = random;
  universe.physics.G = 6.674e-11;
  universe.physics.length_scale = 1e9;
  // Softening acts as the core size of each galaxy. It must stay large enough for the time step to
  // resolve a pass through the core; smaller values make close encounters numerically violent.
  universe.physics.softening = 6e9;
  universe.physics.dt = 60 * 60 * 3;
  universe.physics.trace_age = 60 * 60 * 24 * 400;
  universe.physics.substeps = 3;
  universe.physics.n_asteroids = 500;

  const milkyway = {
    name: "Milky Way",
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
    color: "#ff6",
    mass: 4e30,
    radius: 5,
    x: 300e9,
    y: 0,
    vx: -2e3,
    vy: -4e3,
  };

  const [mw, ag] = universe.generate_planets([milkyway, andromeda]);

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
