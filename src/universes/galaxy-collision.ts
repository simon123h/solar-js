import { Universe } from "../universe";

/**
 * Creates a galaxy collision universe.
 * @returns The created Universe instance configured with two colliding galaxies.
 */
export default function createGalaxyCollision(): Universe {
  const universe = new Universe();
  universe.physics.G = 6.674e-11;
  universe.physics.length_scale = 1e9;
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
    const radius = 1e11 * (0.2 + Math.random());
    universe.circularize(universe.generate_planets([planet])[0], radius, mw, 0.9);
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
    const radius = 1e11 * (0.2 + Math.random());
    universe.circularize(universe.generate_planets([planet])[0], radius, ag, 0.9);
  }

  return universe;
}
