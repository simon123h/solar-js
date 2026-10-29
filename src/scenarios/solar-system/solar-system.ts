import { Universe, PlanetSpec } from "../../core/universe";
import { DEFAULT_SOLAR_SETTINGS, SolarSystemOptions } from "./solar-settings";

/** A planet specification with the radius of its circular orbit around the sun. */
interface OrbitingSpec extends PlanetSpec {
  orbitRadius?: number;
}

/**
 * Creates a solar system universe.
 * @param random - Source of randomness, e.g. a seeded generator for a reproducible scene.
 * @param options - Configuration options for the solar system simulation.
 * @returns The created Universe instance configured with solar system planets.
 */
export default function createSolarSystem(
  random: () => number = Math.random,
  options: SolarSystemOptions = DEFAULT_SOLAR_SETTINGS,
): Universe {
  const universe = new Universe();
  universe.random = random;
  universe.physics.G = 6.674e-11;
  universe.physics.length_scale = 1e9;
  universe.physics.softening = 1e9;
  universe.physics.dt = 60 * 60 * 6;
  universe.physics.trace_age = 60 * 60 * 24 * 400;
  universe.physics.substeps = 2;
  universe.physics.n_asteroids = options.asteroids;

  const specs: OrbitingSpec[] = [
    {
      name: "Sun",
      color: "#ff0",
      mass: 1.988e30,
      radius: 20,
      shadow: 10,
      x: 0,
      y: 0,
    },
    // {
    //     "name": "Sun2",
    //     "color": "#f0f",
    //     "mass": 1.988e29,
    //     "radius": 12,
    //     "orbitRadius": 5e10,
    // },
    {
      name: "Mercury",
      color: "#999999",
      mass: 3.3011e23,
      radius: 2,
      orbitRadius: 5.9133e10,
    },
    {
      name: "Venus",
      color: "#ffff99",
      mass: 4.8675e23,
      radius: 4,
      orbitRadius: 1.082e11,
    },
    {
      name: "Earth",
      color: "#0077ff",
      mass: 5.972e24,
      radius: 5,
      orbitRadius: 1.5e11,
    },
    {
      name: "Mars",
      color: "#ff0000",
      mass: 6.4185e23,
      radius: 4,
      orbitRadius: 2.289e11,
    },
    {
      name: "Jupiter",
      color: "#ff8c00",
      mass: 1.8986e27,
      radius: 11,
      orbitRadius: 7.793e11,
    },
    {
      name: "Saturn",
      color: "#ffff80",
      mass: 5.6846e26,
      radius: 5,
      orbitRadius: 1.429e12,
    },
    {
      name: "Uranus",
      color: "#7fffd4",
      mass: 8.6832e25,
      radius: 5,
      orbitRadius: 2.874e12,
    },
    {
      name: "Neptune",
      color: "#4169e1",
      mass: 1.0243e26,
      radius: 5,
      orbitRadius: 4.498e12,
    },
  ];

  if (options.include_pluto) {
    specs.push({
      name: "Pluto",
      color: "#808080",
      mass: 1.303e22,
      radius: 5,
      orbitRadius: 6.089e12,
    });
  }

  // add the asteroid belt
  for (let n = 0; n < universe.physics.n_asteroids!; n++) {
    specs.push({
      name: "Asteroid" + n,
      color: "#AAA",
      mass: 1e15,
      radius: 1,
      orbitRadius: 4e11 * (1 + 0.05 * universe.random()),
      is_dummy: true,
    });
  }

  const planets = universe.generate_planets(specs);

  // make all planets circle around the sun
  const sun = planets[0];
  planets.forEach((planet, i) => {
    const orbitRadius = specs[i].orbitRadius;
    if (orbitRadius !== undefined) universe.circularize(planet, orbitRadius, sun);
  });

  return universe;
}
