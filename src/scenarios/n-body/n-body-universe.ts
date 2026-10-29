import { Universe } from "../../core/universe";
import { DEFAULT_N_BODY_SETTINGS, NBodyOptions } from "./n-body-settings";

/**
 * Creates an N-Body problem universe.
 * @param random - Source of randomness, e.g. a seeded generator for a reproducible scene.
 * @param options - Configuration options for the n-body simulation.
 * @returns The created Universe instance configured with random bodies.
 */
export default function createNBodyUniverse(
  random: () => number = Math.random,
  options: NBodyOptions = DEFAULT_N_BODY_SETTINGS,
): Universe {
  const universe = new Universe();
  universe.random = random;
  universe.physics.G = 6.674e-11;
  universe.physics.length_scale = 1e5;
  universe.physics.softening = 5e5;
  universe.physics.dt = 60 * 60 * 24;
  universe.physics.trace_age = 1e7;
  universe.physics.substeps = 1;
  universe.physics.n_asteroids = options.bodies;

  const total_bodies = options.bodies;
  const varied = options.varied_masses ?? false;
  const velocity_scale = options.velocity_scale ?? 1.0;

  // add random bodies
  for (let n = 0; n < total_bodies; n++) {
    const x = 800 * universe.physics.length_scale * (0.5 - universe.random());
    const y = 800 * universe.physics.length_scale * (0.5 - universe.random());
    const r = Math.sqrt(x * x + y * y) || 1;

    let vx = 0;
    let vy = 0;

    switch (options.velocity_arrangement) {
      case "stationary":
        vx = 0;
        vy = 0;
        break;
      case "circular": {
        // approximate circular orbit speed around the center of mass cloud
        const speed = (0.35 + 0.15 * universe.random()) * velocity_scale;
        vx = -speed * (y / r);
        vy = speed * (x / r);
        break;
      }
      case "inward": {
        const speed = (0.25 + 0.2 * universe.random()) * velocity_scale;
        vx = -speed * (x / r);
        vy = -speed * (y / r);
        break;
      }
      case "outward": {
        const speed = (0.35 + 0.25 * universe.random()) * velocity_scale;
        vx = speed * (x / r);
        vy = speed * (y / r);
        break;
      }
      case "random": {
        const angle = universe.random() * 2 * Math.PI;
        const speed = 0.5 * universe.random() * velocity_scale;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        break;
      }
    }

    const massFactor = varied ? Math.pow(10, universe.random() * 2 - 1) : 1;
    const mass = 1e15 * massFactor;
    const radius = varied ? Math.max(1, Math.min(8, Math.round(3 * Math.cbrt(massFactor)))) : 3;

    universe.generate_planets([
      {
        name: "",
        color: `hsl(${universe.random() * 360} 60% 70%)`,
        mass,
        radius,
        x,
        y,
        vx,
        vy,
      },
    ]);
  }

  return universe;
}

