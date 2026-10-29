import {
  GALAXY_HALO,
  GALAXY_UNITS,
  add_velocity_dispersion,
  exponential_disk_radius,
  spiral_angle,
} from "./galaxy-collision";
import { Planet } from "../planet";
import { PlanetSpec, Universe } from "../universe";
import { BinaryGalaxyOptions, DEFAULT_BINARY_GALAXY_SETTINGS } from "../binary-galaxy-settings";

const DISK_SCALE_LENGTH = 0.35e11;
const DISK_MIN_RADIUS = 0.05e11;
const DISK_MAX_RADIUS = 1.6e11;

/**
 * Creates a universe containing a single galaxy hosting a central binary supermassive black hole system.
 * The two black holes closely orbit their mutual center of mass, dynamically perturbing stellar orbits.
 *
 * @param random - Source of randomness for reproducible scenes.
 * @param options - Configuration options for separation, mass ratio, stars, and halo.
 * @returns Configured Universe instance.
 */
export default function createBinaryGalaxy(
  random: () => number = Math.random,
  options: BinaryGalaxyOptions = DEFAULT_BINARY_GALAXY_SETTINGS,
): Universe {
  const universe = new Universe();
  universe.random = random;
  universe.units = GALAXY_UNITS;
  universe.physics.G = 6.674e-11;
  universe.physics.length_scale = 1e9;
  universe.physics.softening = 4e9;
  universe.physics.dt = 60 * 60 * 3; // 3 hours per step
  universe.physics.trace_age = 60 * 60 * 24 * 300;
  universe.physics.substeps = 3;
  universe.physics.n_asteroids = options.stars;

  // Convert separation from kpc to simulation meters (1 kpc = 1e10 meters)
  const separationMeters = options.separation_kpc * GALAXY_UNITS.meters_per_length_unit;

  // Total central black hole mass = 3e30 kg (approx 1.5 million solar masses in scale)
  const totalMass = 3e30;
  const q = Math.max(0.1, Math.min(1.0, options.mass_ratio));
  const m1 = totalMass / (1 + q);
  const m2 = totalMass * (q / (1 + q));

  // Radii from center of mass for circular orbit
  const r1 = (m2 / totalMass) * separationMeters;
  const r2 = (m1 / totalMass) * separationMeters;

  // Relative circular velocity v_rel = sqrt(G * M_total / separation)
  const vRel = Math.sqrt((universe.physics.G * totalMass) / separationMeters);
  const v1 = (m2 / totalMass) * vRel;
  const v2 = (m1 / totalMass) * vRel;

  const bh1Spec: PlanetSpec = {
    name: "",
    mass: m1,
    radius: 6,
    color: "#a855f7", // purple
    shadow: 12,
    x: -r1,
    y: 0,
    vx: 0,
    vy: v1,
    core_radius: 1e9,
    highlight: true,
  };

  const bh2Spec: PlanetSpec = {
    name: "",
    mass: m2,
    radius: Math.max(3, Math.round(6 * Math.cbrt(q))),
    color: "#ec4899", // pink
    shadow: 10,
    x: r2,
    y: 0,
    vx: 0,
    vy: -v2,
    core_radius: 1e9,
    highlight: true,
  };

  const [bh1, bh2] = universe.generate_planets([bh1Spec, bh2Spec]);

  // Optional dark matter halo centered on the barycenter (approximated on primary or both)
  if (options.halo) {
    universe.add_halo(bh1, GALAXY_HALO.v0, GALAXY_HALO.core_radius, GALAXY_HALO.truncation_radius, false);
  }

  // Generate stellar disk orbiting the binary system
  const binaryAttractor = [bh1, bh2];

  for (let n = 0; n < options.stars; n++) {
    const isEarth = n === 0;
    const starSpec: PlanetSpec = {
      name: isEarth ? "Solar System" : "",
      color: isEarth ? "#38bdf8" : "#e0e7ff",
      mass: 1e15,
      radius: isEarth ? 3 : 1,
      highlight: isEarth,
      shadow: isEarth ? 8 : undefined,
      is_dummy: !isEarth,
    };

    // Minimum radius ensures stars do not start directly inside the binary separation orbit
    const minStarRadius = Math.max(DISK_MIN_RADIUS, separationMeters * 1.5);
    const radius = isEarth
      ? 0.8e11 // 8 kpc
      : exponential_disk_radius(universe.random, DISK_SCALE_LENGTH, minStarRadius, DISK_MAX_RADIUS);

    const [star] = universe.generate_planets([starSpec]);
    universe.circularize(star, radius, binaryAttractor, 1, spiral_angle(radius, universe.random, 1));
    add_velocity_dispersion(star, bh1, 0.08, universe.random);
  }

  return universe;
}
