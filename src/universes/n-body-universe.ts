import { Universe } from "../universe";

/**
 * Creates an N-Body problem universe.
 * @returns The created Universe instance configured with random bodies.
 */
export default function createNBodyUniverse(): Universe {
  const universe = new Universe();
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
        color: `hsl(${Math.random() * 360} 60% 70%)`,
        mass: 1e15,
        radius: 3,
        x: 800 * universe.physics.length_scale * (0.5 - Math.random()),
        y: 800 * universe.physics.length_scale * (0.5 - Math.random()),
      },
    ]);
  }

  return universe;
}
