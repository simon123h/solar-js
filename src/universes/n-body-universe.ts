import { Universe } from "../universe";

/**
 * Creates an N-Body problem universe.
 * @param random - Source of randomness, e.g. a seeded generator for a reproducible scene.
 * @returns The created Universe instance configured with random bodies.
 */
export default function createNBodyUniverse(random: () => number = Math.random): Universe {
  const universe = new Universe();
  universe.random = random;
  universe.physics.G = 6.674e-11;
  universe.physics.length_scale = 1e5;
  universe.physics.dt = 60 * 60 * 24;
  universe.physics.trace_age = 1e7;
  universe.physics.substeps = 1;
  universe.physics.n_asteroids = 400;

  // add random bodies
  for (let n = 0; n < universe.physics.n_asteroids!; n++) {
    universe.generate_planets([
      {
        name: "",
        color: `hsl(${universe.random() * 360} 60% 70%)`,
        mass: 1e15,
        radius: 3,
        x: 800 * universe.physics.length_scale * (0.5 - universe.random()),
        y: 800 * universe.physics.length_scale * (0.5 - universe.random()),
      },
    ]);
  }

  return universe;
}
