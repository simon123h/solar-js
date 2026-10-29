import { describe, it, expect } from "vitest";
import createGalaxyCollision, { GALAXY_BULGE_RADIUS, GALAXY_HALO } from "../src/universes/galaxy-collision";
import { place_encounter } from "../src/encounter";
import { seeded_random } from "../src/random";
import { Universe } from "../src/universe";

const full_options = { halo: GALAXY_HALO, bulge_radius: GALAXY_BULGE_RADIUS, stars: 0 };

/** The smallest distance of the two galaxies before they move apart again, in the real universe. */
function first_pericenter(universe: Universe): number {
  const [first, second] = universe.planets;
  let closest = Math.hypot(second.x - first.x, second.y - first.y);
  for (let step = 0; step < 40000; step++) {
    universe.integration_step();
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    closest = Math.min(closest, distance);
    if (distance > 1.5 * closest) break;
  }
  return closest;
}

describe("place_encounter", () => {
  it.each([
    ["point masses", { stars: 0 }, 100e9, 1],
    ["halos and bulges", full_options, 130e9, 1],
    ["halos and bulges, a fast encounter", full_options, 60e9, 1.3],
    ["halos, bulges and friction", { ...full_options, friction: true }, 130e9, 1],
    ["halos, bulges and friction, close", { ...full_options, friction: true }, 50e9, 1],
  ])("should reach the requested first closest approach with %s", (_name, options, pericenter, eccentricity) => {
    const universe = createGalaxyCollision(seeded_random(1), { ...options, encounter: { pericenter, eccentricity } });
    // within 5% of the requested distance, measured in the real universe
    expect(Math.abs(first_pericenter(universe) / pericenter - 1)).toBeLessThan(0.05);
  });

  it("should start the galaxies at the given distance in their center of mass frame", () => {
    const universe = createGalaxyCollision(seeded_random(1), {
      ...full_options,
      encounter: { pericenter: 100e9, eccentricity: 1, separation: 450e9 },
    });
    const [first, second] = universe.planets;
    const total = first.mass + second.mass;
    expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeCloseTo(450e9, -3);
    expect((first.mass * first.x + second.mass * second.x) / total).toBeCloseTo(0, -3);
    expect(first.y).toBe(0);
    expect(first.mass * first.vx + second.mass * second.vx).toBeCloseTo(0, -15);
    expect(first.mass * first.vy + second.mass * second.vy).toBeCloseTo(0, -15);
  });

  it("should approach counter-clockwise, like the default scene", () => {
    const orbit = (universe: Universe) => {
      const [first, second] = universe.planets;
      return (second.x - first.x) * (second.vy - first.vy) - (second.y - first.y) * (second.vx - first.vx);
    };
    const placed = createGalaxyCollision(seeded_random(1), { ...full_options, encounter: { pericenter: 100e9, eccentricity: 1 } });
    expect(Math.sign(orbit(placed))).toBe(Math.sign(orbit(createGalaxyCollision(seeded_random(1), full_options))));
    // and the first galaxy approaches the second one, instead of moving away
    const [first, second] = placed.planets;
    expect((second.x - first.x) * (second.vx - first.vx)).toBeLessThan(0);
  });

  it("should set the speed from the eccentricity of the equivalent Kepler orbit", () => {
    const relative_speed = (eccentricity: number, pericenter = 100e9) => {
      const universe = createGalaxyCollision(seeded_random(1), { stars: 0, encounter: { pericenter, eccentricity } });
      const [first, second] = universe.planets;
      return Math.hypot(second.vx - first.vx, second.vy - first.vy);
    };
    const parabolic = relative_speed(1);
    // v^2 = mu (2 / d - (1 - e) / rp) and mu = v_parabolic^2 d / 2 give v^2 / v_parabolic^2 = 1 + (e - 1) d / (2 rp)
    for (const eccentricity of [1.3, 2, 0.9]) {
      expect((relative_speed(eccentricity) / parabolic) ** 2).toBeCloseTo(1 + ((eccentricity - 1) * 600e9) / (2 * 100e9), 6);
    }
    expect(relative_speed(1.3)).toBeGreaterThan(parabolic);
    expect(relative_speed(0.9)).toBeLessThan(parabolic);
  });

  it("should keep the galaxies where they are for the stars, which are placed after the encounter", () => {
    const universe = createGalaxyCollision(seeded_random(1), {
      halo: GALAXY_HALO,
      stars: 30,
      encounter: { pericenter: 100e9, eccentricity: 1 },
    });
    const [first, second] = universe.planets;
    // each star moves with its galaxy: its velocity relative to the galaxy is the orbital speed, not the encounter speed
    const speeds = universe.planets.filter((p) => p.name.startsWith("AG")).map((p) => Math.hypot(p.vx - second.vx, p.vy - second.vy));
    expect(Math.max(...speeds)).toBeLessThan(2.5e5);
    expect(Math.hypot(second.vx - first.vx, second.vy - first.vy)).toBeGreaterThan(0);
  });

  it("should refuse parameters that make no sense", () => {
    const place =
      (encounter: Parameters<typeof place_encounter>[3], options = full_options) =>
      () =>
        createGalaxyCollision(seeded_random(1), { ...options, encounter });
    expect(place({ pericenter: 0, eccentricity: 1 })).toThrow("pericenter < separation");
    expect(place({ pericenter: -1e9, eccentricity: 1 })).toThrow("pericenter < separation");
    expect(place({ pericenter: 700e9, eccentricity: 1 })).toThrow("pericenter < separation");
    expect(place({ pericenter: 100e9, eccentricity: -0.5 })).toThrow("non-negative eccentricity");
    expect(place({ pericenter: NaN, eccentricity: 1 })).toThrow("pericenter < separation");
    expect(place({ pericenter: 100e9, eccentricity: 1, separation: 0 })).toThrow("pericenter < separation");
  });

  it("should explain when a bound orbit cannot start so far apart", () => {
    const create = () => createGalaxyCollision(seeded_random(1), { ...full_options, encounter: { pericenter: 60e9, eccentricity: 0.6 } });
    // apocenter = 60e9 * 1.6 / 0.4 = 2.4e11, closer than the 6e11 start
    expect(create).toThrow("never gets farther apart than about 2.4e+11 m");
  });

  it("should refuse a pericenter that the softened cores can never reach", () => {
    const create = () => createGalaxyCollision(seeded_random(1), { ...full_options, encounter: { pericenter: 1e8, eccentricity: 1 } });
    expect(create).toThrow("no sideways speed gives this pericenter");
  });
});
