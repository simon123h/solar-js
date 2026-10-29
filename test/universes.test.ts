import { describe, it, expect } from "vitest";
import createSolarSystem from "../src/universes/solar-system";
import createGalaxyCollision, { spiral_angle } from "../src/universes/galaxy-collision";
import createNBodyUniverse from "../src/universes/n-body-universe";
import { seeded_random } from "../src/random";

describe("Universe Factories", () => {
  it("should create Solar System", () => {
    const universe = createSolarSystem();
    expect(universe.planets.length).toBeGreaterThan(10);
    expect(universe.get_planet_by_name("Sun")).toBeDefined();
    expect(universe.get_planet_by_name("Earth")).toBeDefined();
  });

  it("should create Galaxy Collision", () => {
    const universe = createGalaxyCollision();
    expect(universe.planets.length).toBeGreaterThan(2);
    expect(universe.get_planet_by_name("Milky Way")).toBeDefined();
    expect(universe.get_planet_by_name("Andromeda Galaxy")).toBeDefined();

    const earth = universe.get_planet_by_name("Earth");
    expect(earth?.is_dummy).toBe(false);
    expect(universe.planets.filter((p) => !p.is_dummy).map((p) => p.name)).toEqual(["Milky Way", "Andromeda Galaxy", "Earth"]);
  });

  it("should resolve passes through the galaxy cores with its time step", () => {
    const universe = createGalaxyCollision();
    const heaviest = Math.max(...universe.planets.map((p) => p.mass));
    const core_crossing_time = Math.sqrt(universe.physics.softening ** 3 / (universe.physics.G * heaviest));
    // a time step much longer than this injects spurious energy and flings bodies out of the galaxies
    expect(core_crossing_time).toBeGreaterThan(universe.physics.dt * 2);
  });

  describe("spiral arms", () => {
    /**
     * Phase coherence of the stars around a center: 0 for a uniform disk, 1 if all stars lie exactly on
     * the arms. Each star's angle is corrected by the arm's winding, then folded onto one arm period.
     */
    function arm_coherence(bodies: { x: number; y: number }[], center: { x: number; y: number }, arms: number): number {
      let re = 0;
      let im = 0;
      for (const b of bodies) {
        const radius = Math.hypot(b.x - center.x, b.y - center.y);
        const angle = Math.atan2(b.y - center.y, b.x - center.x);
        const phase = arms * (angle - 2.75 * Math.log(radius / 0.2e11));
        re += Math.cos(phase);
        im += Math.sin(phase);
      }
      return Math.hypot(re, im) / bodies.length;
    }

    it("should gather the stars of both galaxies along two spiral arms", () => {
      const universe = createGalaxyCollision(seeded_random(3));
      const [mw, ag] = universe.planets;
      const stars = (prefix: string) => universe.planets.filter((p) => p.name.startsWith(prefix));
      expect(arm_coherence(stars("MW"), mw, 2)).toBeGreaterThan(0.6);
      expect(arm_coherence(stars("AG"), ag, 2)).toBeGreaterThan(0.6);
    });

    it("should not gather them along arms with a different count of arms", () => {
      const universe = createGalaxyCollision(seeded_random(3));
      const stars = universe.planets.filter((p) => p.name.startsWith("MW"));
      // three arms would see the two real arms cancel out
      expect(arm_coherence(stars, universe.planets[0], 3)).toBeLessThan(0.2);
    });

    it("should put stars on both arms, spread over the whole disk", () => {
      const random = seeded_random(5);
      const angles = Array.from({ length: 2000 }, () => spiral_angle(1e11, random));
      const per_arm = [0, 0];
      const offset = 2.75 * Math.log(1e11 / 0.2e11);
      for (const a of angles) per_arm[Math.round((a - offset) / Math.PI) % 2 === 0 ? 0 : 1]++;
      expect(per_arm[0]).toBeGreaterThan(800);
      expect(per_arm[1]).toBeGreaterThan(800);
    });

    it("should trail the arms: the angle increases outwards, against the direction of rotation", () => {
      const fixed = () => 0.5;
      expect(spiral_angle(1e11, fixed)).toBeGreaterThan(spiral_angle(0.5e11, fixed));
    });
  });

  it("should create N-Body Universe", () => {
    const universe = createNBodyUniverse();
    expect(universe.planets.length).toBeGreaterThan(0);
  });

  it.each([
    ["Solar System", createSolarSystem],
    ["Galaxy Collision", createGalaxyCollision],
    ["N-Body Universe", createNBodyUniverse],
  ])("should create the same %s from the same seed", (_name, create) => {
    const state = (random: () => number) => create(random).planets.map((p) => [p.x, p.y, p.vx, p.vy]);
    expect(state(seeded_random(1))).toEqual(state(seeded_random(1)));
    expect(state(seeded_random(1))).not.toEqual(state(seeded_random(2)));
  });
});
