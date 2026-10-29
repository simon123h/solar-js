import { describe, it, expect } from "vitest";
import { Universe } from "../src/universe";
import { Planet } from "../src/planet";

describe("Universe", () => {
  it("should initialize correctly", () => {
    const universe = new Universe();
    expect(universe.planets).toEqual([]);
    expect(universe.physics.time).toBe(0);
    expect(universe.physics.softening).toBeGreaterThan(0);
  });

  it("should generate planets", () => {
    const universe = new Universe();
    universe.generate_planets([
      { name: "P1", mass: 100, radius: 10 },
      { name: "P2", mass: 200, radius: 20, color: "#f00" },
    ]);
    expect(universe.planets.length).toBe(2);
    expect(universe.planets[0].name).toBe("P1");
    expect(universe.planets[1].color).toBe("#f00");
  });

  it("should return the created planets and copy their initial state", () => {
    const universe = new Universe();
    const [p1, p2] = universe.generate_planets([
      { name: "P1", mass: 100, radius: 10, x: 1, y: 2, vx: 3, vy: 4, shadow: 5, is_dummy: true },
      { name: "P2", mass: 200, radius: 20 },
    ]);
    expect(universe.planets).toEqual([p1, p2]);
    expect([p1.x, p1.y, p1.vx, p1.vy, p1.shadow, p1.is_dummy]).toEqual([1, 2, 3, 4, 5, true]);
    expect([p2.x, p2.y, p2.vx, p2.vy, p2.shadow, p2.is_dummy]).toEqual([0, 0, 0, 0, null, false]);
  });

  it("should find planet by name", () => {
    const universe = new Universe();
    universe.generate_planets([
      { name: "P1", mass: 100, radius: 10 },
      { name: "P2", mass: 200, radius: 20 },
    ]);
    expect(universe.get_planet_by_name("P1")).toBeDefined();
    expect(universe.get_planet_by_name("P3")).toBeNull();
  });

  it("should circularize orbit around a single body", () => {
    const universe = new Universe();
    const sun = new Planet("Sun", 1e30, 10);
    sun.x = 0;
    sun.y = 0;
    universe.planets.push(sun);

    const earth = new Planet("Earth", 1e24, 5);
    universe.planets.push(earth);

    const orbitRadius = 1e11;
    universe.circularize(earth, orbitRadius, sun);

    const dist = Math.sqrt(earth.x * earth.x + earth.y * earth.y);
    expect(dist).toBeCloseTo(orbitRadius, -5);

    const expectedV = Math.sqrt((universe.physics.G * sun.mass) / orbitRadius);
    expect(earth.v).toBeCloseTo(expectedV, -5);
  });

  it("should circularize orbit around center of mass (array of attractors)", () => {
    const universe = new Universe();
    // Two stars of equal mass at (-d, 0) and (d, 0)
    // Center of mass should be at (0, 0) with total mass 2*M
    const M = 1e30;
    const star1 = new Planet("Star1", M, 10);
    star1.x = -1e10;
    star1.y = 0;

    const star2 = new Planet("Star2", M, 10);
    star2.x = 1e10;
    star2.y = 0;

    const planet = new Planet("Planet", 1e24, 5);
    universe.planets.push(star1, star2, planet);

    const orbitRadius = 1e11;
    universe.circularize(planet, orbitRadius, [star1, star2]);

    // Distance from (0,0) should be orbitRadius
    const dist = Math.sqrt(planet.x * planet.x + planet.y * planet.y);
    expect(dist).toBeCloseTo(orbitRadius, -5);

    // Velocity should be based on 2*M
    const expectedV = Math.sqrt((universe.physics.G * (2 * M)) / orbitRadius);
    expect(planet.v).toBeCloseTo(expectedV, -5);
  });

  it("should carry the velocity of a moving attractor", () => {
    const universe = new Universe();
    universe.generate_planets([
      { name: "Star", mass: 1e30, radius: 10, x: 5e11, y: -3e11, vx: 4e3, vy: -2e3 },
      { name: "Planet", mass: 1e24, radius: 5 },
    ]);
    const [star, planet] = universe.planets;
    universe.circularize(planet, 1e11, star);

    // relative to the star the planet moves at the circular orbit speed
    const relative_speed = Math.hypot(planet.vx - star.vx, planet.vy - star.vy);
    expect(relative_speed).toBeCloseTo(Math.sqrt((universe.physics.G * star.mass) / 1e11), 0);
    expect(Math.hypot(planet.x - star.x, planet.y - star.y)).toBeCloseTo(1e11, -3);
  });

  it("should carry the center of mass velocity of several attractors", () => {
    const universe = new Universe();
    universe.generate_planets([
      { name: "A", mass: 3e30, radius: 10, x: -1e10, vx: 1e3, vy: 0 },
      { name: "B", mass: 1e30, radius: 10, x: 3e10, vx: -5e3, vy: 8e3 },
      { name: "Planet", mass: 1e24, radius: 5 },
    ]);
    const [a, b, planet] = universe.planets;
    universe.circularize(planet, 1e12, [a, b]);

    // center of mass velocity is (3e3 - 5e3, 8e3) / 4 = (-500, 2000)
    const speed = Math.sqrt((universe.physics.G * 4e30) / 1e12);
    expect(Math.hypot(planet.vx + 500, planet.vy - 2000)).toBeCloseTo(speed, 0);
  });

  it("should place the planet at the given start angle", () => {
    const universe = new Universe();
    universe.generate_planets([
      { name: "Sun", mass: 1e30, radius: 10, x: 1e11, y: 2e11 },
      { name: "Earth", mass: 1e24, radius: 5 },
    ]);
    const [sun, earth] = universe.planets;
    universe.random = () => {
      throw new Error("the start angle should replace the random one");
    };
    universe.circularize(earth, 1e11, sun, 1, Math.PI / 2);
    expect(earth.x).toBeCloseTo(1e11, -3);
    expect(earth.y).toBeCloseTo(3e11, -3);
    // moving tangentially: counter-clockwise on screen at the top of the orbit means towards +x
    expect(earth.vx).toBeGreaterThan(0);
    expect(earth.vy).toBeCloseTo(0, 6);
  });

  it("should use the injected random source in circularize", () => {
    const universe = new Universe();
    universe.random = () => 0;
    universe.generate_planets([
      { name: "Sun", mass: 1e30, radius: 10 },
      { name: "Earth", mass: 1e24, radius: 5 },
    ]);
    universe.circularize(universe.planets[1], 1e11, universe.planets[0]);
    // angle 0: placed on the +x axis, moving along -y (counter-clockwise on a canvas with y pointing down)
    expect(universe.planets[1].x).toBeCloseTo(1e11);
    expect(universe.planets[1].y).toBeCloseTo(0);
    expect(universe.planets[1].vy).toBeLessThan(0);
  });

  it("should refuse to circularize around nothing or at zero distance", () => {
    const universe = new Universe();
    universe.generate_planets([
      { name: "A", mass: 0, radius: 1 },
      { name: "B", mass: 0, radius: 1 },
      { name: "C", mass: 1e24, radius: 1 },
    ]);
    const [a, b, c] = universe.planets;
    expect(() => universe.circularize(c, 1e11, a)).toThrow("positive mass");
    expect(() => universe.circularize(c, 1e11, [a, b])).toThrow("positive mass");
    expect(() => universe.circularize(c, 0, c)).toThrow("orbit_radius");
    expect(() => universe.circularize(c, NaN, c)).toThrow("orbit_radius");
  });

  it("should run integration steps and update time", () => {
    const universe = new Universe();
    universe.generate_planets([
      { name: "P1", mass: 1e30, radius: 10, x: 0, y: 0 },
      { name: "P2", mass: 1e24, radius: 5, x: 1e11, y: 0, vy: 30000 },
    ]);

    const initialTime = universe.physics.time;
    universe.integration_step();
    expect(universe.physics.time).toBeGreaterThan(initialTime);
  });

  it("should manage trace", () => {
    const universe = new Universe();
    universe.generate_planets([{ name: "P1", mass: 100, radius: 10 }]);
    const p1 = universe.planets[0];

    universe.manage_trace();
    expect(p1.trace).toBeDefined();
    expect(p1.trace?.length).toBe(1);

    // Advance time and trace again
    universe.physics.time += 1000;
    p1.x = 10;
    universe.manage_trace();
    expect(p1.trace?.length).toBe(2);
  });

  it("should ignore dummy planets in trace", () => {
    const universe = new Universe();
    universe.generate_planets([{ name: "Dummy", mass: 100, radius: 10, is_dummy: true }]);
    const dummy = universe.planets[0];
    universe.manage_trace();
    expect(dummy.trace).toBeNull();
  });

  it("should calculate gravitational forces correctly (including dummy interaction)", () => {
    const universe = new Universe();
    // P1: Non-dummy
    // P2: Dummy
    // P3: Non-dummy
    // Forces:
    // P1 affected by P3 (non-dummy) and P2 (dummy)
    // P3 affected by P1 and P2
    // P2 (dummy) affected by P1 and P3?
    // Logic:
    // split planets into dummy and nondummy
    // loop i over nondummy
    //   loop j over rest (nondummy > i + dummy)
    // So nondummy-nondummy and nondummy-dummy are calculated.
    // dummy-dummy is NOT calculated.

    const m = 1e30;
    const d = 1e11;

    universe.generate_planets([
      { name: "ND1", mass: m, x: 0, y: 0, radius: 10, is_dummy: false },
      { name: "D1", mass: m, x: d, y: 0, radius: 10, is_dummy: true },
      { name: "ND2", mass: m, x: -d, y: 0, radius: 10, is_dummy: false },
    ]);

    universe.update_forces();

    const nd1 = universe.get_planet_by_name("ND1")!;
    const d1 = universe.get_planet_by_name("D1")!;
    const nd2 = universe.get_planet_by_name("ND2")!;

    // ND1 is at 0. D1 at d. ND2 at -d.
    // Force on ND1:
    // From D1: +F (towards right)
    // From ND2: -F (towards left)
    // Net force on ND1 should be 0.
    expect(nd1.ax).toBeCloseTo(0, -5);

    // Force on ND2 (at -d):
    // From ND1 (at 0): +F (pulls right)
    // From D1 (at d): +F_far (pulls right, distance 2d)
    // F_far = G * m * m / (2d)^2 = F / 4
    // Net ax > 0
    expect(nd2.ax).toBeGreaterThan(0);

    // Force on D1 (at d):
    // From ND1 (at 0): -F (pulls left)
    // From ND2 (at -d): -F_far (pulls left)
    // Net ax < 0
    expect(d1.ax).toBeLessThan(0);
  });

  it("should handle as_dict with unnamed planets", () => {
    const universe = new Universe();
    universe.generate_planets([
      { name: "Named", mass: 100, radius: 10 },
      { name: "", mass: 100, radius: 10 },
    ]);
    const dict = universe.as_dict();
    expect(dict["Named"]).toBeDefined();
    expect(dict[""]).toBeUndefined();
    expect(Object.keys(dict).length).toBe(1);
  });

  describe("integration accuracy", () => {
    const orbit_radius = 1.496e11;
    const sun_mass = 1.988e30;

    function createTwoBodyUniverse(): { universe: Universe; sun: Planet; earth: Planet } {
      const universe = new Universe();
      universe.generate_planets([
        { name: "Sun", mass: sun_mass, radius: 1, x: 0, y: 0 },
        { name: "Earth", mass: 5.972e24, radius: 1 },
      ]);
      const [sun, earth] = universe.planets;
      universe.circularize(earth, orbit_radius, sun);
      return { universe, sun, earth };
    }

    it("should conserve energy on a circular orbit", () => {
      const { universe } = createTwoBodyUniverse();
      const initial_energy = universe.total_energy();

      // ten years at 6h steps
      for (let i = 0; i < 14600; i++) {
        universe.integration_step();
        const drift = Math.abs((universe.total_energy() - initial_energy) / initial_energy);
        expect(drift).toBeLessThan(1e-9);
      }
    });

    it("should keep a circular orbit circular", () => {
      const { universe, sun, earth } = createTwoBodyUniverse();

      for (let i = 0; i < 14600; i++) {
        universe.integration_step();
        const r = Math.hypot(earth.x - sun.x, earth.y - sun.y);
        expect(Math.abs(r / orbit_radius - 1)).toBeLessThan(1e-5);
      }
    });
  });

  describe("total_energy", () => {
    it("should add kinetic and softened potential energy", () => {
      const universe = new Universe();
      universe.physics.softening = 0;
      universe.generate_planets([
        { name: "A", mass: 2e24, radius: 1, vx: 10 },
        { name: "B", mass: 1e24, radius: 1, x: 1e9, vy: -20 },
      ]);
      const G = universe.physics.G;
      const expected = 0.5 * 2e24 * 100 + 0.5 * 1e24 * 400 - (G * 2e24 * 1e24) / 1e9;
      expect(universe.total_energy() / expected).toBeCloseTo(1, 12);
    });

    it("should not count the potential between two dummies", () => {
      const universe = new Universe();
      universe.generate_planets([
        { name: "A", mass: 1e24, radius: 1, is_dummy: true },
        { name: "B", mass: 1e24, radius: 1, x: 1e9, is_dummy: true },
      ]);
      expect(universe.total_energy()).toBe(0);
    });
  });

  describe("softening", () => {
    it("should keep forces finite when planets coincide", () => {
      const universe = new Universe();
      universe.generate_planets([
        { name: "P1", mass: 1e30, radius: 10 },
        { name: "P2", mass: 1e30, radius: 10 },
      ]);
      universe.update_forces();
      for (const p of universe.planets) {
        expect(Number.isFinite(p.ax)).toBe(true);
        expect(Number.isFinite(p.ay)).toBe(true);
      }
    });

    it("should match Newtonian gravity far outside the softening length", () => {
      const universe = new Universe();
      universe.physics.softening = 1e6;
      universe.generate_planets([
        { name: "Sun", mass: 1e30, radius: 10 },
        { name: "P", mass: 1e24, radius: 5, x: 1e11 },
      ]);
      universe.update_forces();
      const G = universe.physics.G;
      const r2 = 1e11 * 1e11;
      // the softened force deviates by about (softening / r)^2
      expect(universe.planets[1].ax / ((-G * 1e30) / r2)).toBeCloseTo(1, 9);
      expect(universe.planets[0].ax / ((G * 1e24) / r2)).toBeCloseTo(1, 9);
    });

    it("should weaken the force inside the softening length", () => {
      const universe = new Universe();
      universe.physics.softening = 1e9;
      universe.generate_planets([
        { name: "Sun", mass: 1e30, radius: 10 },
        { name: "P", mass: 1e24, radius: 5, x: 1e8 },
      ]);
      universe.update_forces();
      const newtonian = (universe.physics.G * 1e30) / (1e8 * 1e8);
      expect(Math.abs(universe.planets[1].ax)).toBeLessThan(newtonian / 100);
    });

    it("should circularize orbits with the softened force", () => {
      const universe = new Universe();
      universe.physics.softening = 5e10;
      universe.generate_planets([
        { name: "Sun", mass: 1e30, radius: 10 },
        { name: "P", mass: 1e24, radius: 5 },
      ]);
      const [sun, p] = universe.planets;
      universe.circularize(p, 1e11, sun);
      universe.update_forces();
      // centripetal acceleration v^2 / r equals the gravitational acceleration
      expect((p.v * p.v) / 1e11).toBeCloseTo(Math.hypot(p.ax, p.ay), 12);
    });
  });
});
