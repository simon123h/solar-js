import { Planet } from "./planet";
import { Universe } from "./universe";

/** How two galaxies approach each other. */
export interface Encounter {
  /** The distance between the galaxies at the start, in meters; 6e11 by default. */
  separation?: number;
  /** The distance between the galaxies at their first closest approach, in meters. */
  pericenter: number;
  /**
   * The eccentricity of the equivalent Kepler orbit: 1 starts with the speed of a parabolic orbit, below 1
   * with less speed (a bound orbit) and above 1 with more. The equivalent orbit uses the pull between the two
   * galaxies at the starting distance, halos included, so it describes the speed, not the exact shape of the orbit.
   */
  eccentricity: number;
}

/** The distance between the galaxies at the start, if no other is given. */
export const DEFAULT_SEPARATION = 600e9;

/**
 * Two bodies that move like the given ones, with the same halos and physics, to try out an encounter on.
 */
function copy_pair(universe: Universe, first: Planet, second: Planet): { universe: Universe; a: Planet; b: Planet } {
  const copy = new Universe();
  copy.physics = { ...universe.physics };
  const [a, b] = copy.generate_planets(
    [first, second].map((p) => ({ name: p.name, mass: p.mass, radius: p.radius, core_radius: p.core_radius })),
  );
  for (const halo of universe.halos) {
    if (halo.center === first) copy.add_halo(a, halo.v0, halo.core_radius, halo.truncation_radius, halo.friction);
    if (halo.center === second) copy.add_halo(b, halo.v0, halo.core_radius, halo.truncation_radius, halo.friction);
  }
  return { universe: copy, a, b };
}

/**
 * Places two bodies at the given distance on the x axis, in their center of mass frame, approaching with a
 * velocity relative to each other of the given radial and tangential parts.
 */
function set_approach(first: Planet, second: Planet, separation: number, radial_speed: number, tangential_speed: number): void {
  const total = first.mass + second.mass;
  first.x = (-separation * second.mass) / total;
  second.x = (separation * first.mass) / total;
  first.y = second.y = 0;
  // the relative motion counter-clockwise on screen, like the default scene
  const relative_x = -radial_speed;
  const relative_y = -tangential_speed;
  first.vx = (-second.mass / total) * relative_x;
  first.vy = (-second.mass / total) * relative_y;
  second.vx = (first.mass / total) * relative_x;
  second.vy = (first.mass / total) * relative_y;
}

/**
 * Simulates the approach of two bodies up to their first closest approach.
 * @returns The smallest distance reached, before the bodies move apart again.
 */
function first_pericenter(universe: Universe, a: Planet, b: Planet): number {
  let closest = Math.hypot(b.x - a.x, b.y - a.y);
  for (let step = 0; step < 20000; step++) {
    universe.integration_step();
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    closest = Math.min(closest, distance);
    if (distance > 1.5 * closest) break;
  }
  return closest;
}

/**
 * Puts two galaxies on an encounter with a given first closest approach, in their center of mass frame.
 * The speed at the start follows from the eccentricity and the pull between the galaxies. How it splits into
 * approaching and sideways motion is found by trying out the real forces, friction included, so the first
 * closest approach is the requested one.
 * @param universe - The universe with the galaxies and their halos; this must be done before adding stars.
 * @param first - The first galaxy.
 * @param second - The second galaxy.
 * @param encounter - How they approach each other.
 * @throws If the parameters are impossible, or no sideways speed gives the requested pericenter.
 */
export function place_encounter(universe: Universe, first: Planet, second: Planet, encounter: Encounter): void {
  const { separation = DEFAULT_SEPARATION, pericenter, eccentricity } = encounter;
  if (!(separation > 0) || !(pericenter > 0) || !(pericenter < separation) || !(eccentricity >= 0)) {
    throw new Error("place_encounter: need 0 < pericenter < separation and a non-negative eccentricity");
  }

  const trial = copy_pair(universe, first, second);
  set_approach(trial.a, trial.b, separation, 0, 0);
  trial.universe.update_forces();
  // the pull between the two at the starting distance defines the equivalent Kepler orbit
  const mu = Math.abs(trial.b.ax - trial.a.ax) * separation * separation;
  const speed_squared = mu * (2 / separation - (1 - eccentricity) / pericenter);
  if (!(speed_squared > 0)) {
    const farthest = (pericenter * (1 + eccentricity)) / (1 - eccentricity);
    throw new Error(
      `place_encounter: an orbit with this pericenter and eccentricity never gets farther apart than about ${farthest.toExponential(1)} m`,
    );
  }
  const speed = Math.sqrt(speed_squared);

  const reached = (tangential_speed: number): number => {
    const radial_speed = Math.sqrt(Math.max(0, speed_squared - tangential_speed * tangential_speed));
    const attempt = copy_pair(universe, first, second);
    set_approach(attempt.a, attempt.b, separation, radial_speed, tangential_speed);
    return first_pericenter(attempt.universe, attempt.a, attempt.b);
  };

  // more sideways speed gives a larger pericenter
  let low = 0;
  let high = speed;
  for (let i = 0; i < 30; i++) {
    const middle = (low + high) / 2;
    if (reached(middle) < pericenter) low = middle;
    else high = middle;
  }
  const tangential_speed = (low + high) / 2;
  if (Math.abs(reached(tangential_speed) / pericenter - 1) > 0.05) {
    throw new Error("place_encounter: no sideways speed gives this pericenter");
  }
  set_approach(first, second, separation, Math.sqrt(speed_squared - tangential_speed * tangential_speed), tangential_speed);
}
