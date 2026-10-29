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

  describe("halo", () => {
    const v0 = 4e4;
    const rc = 2e10;
    const rt = 3e11;

    /** The expected acceleration towards the center at distance d. */
    const halo_acceleration = (d: number) => (v0 * v0 * d * rt * rt) / ((d * d + rc * rc) * (d * d + rt * rt));

    /** A massive center with a halo and one light star at the given distance, with gravity switched off. */
    function createHaloUniverse(distance: number, star_mass = 1e10): { universe: Universe; center: Planet; star: Planet } {
      const universe = new Universe();
      universe.physics.G = 0;
      const [center, star] = universe.generate_planets([
        { name: "Center", mass: 1e30, radius: 1, x: 1e11, y: -2e11 },
        { name: "Star", mass: star_mass, radius: 1, x: 1e11 + distance, y: -2e11 },
      ]);
      universe.add_halo(center, v0, rc, rt);
      return { universe, center, star };
    }

    it("should pull planets towards the center of the halo", () => {
      const { universe, star } = createHaloUniverse(1e11);
      universe.update_forces();
      expect(star.ax).toBeCloseTo(-halo_acceleration(1e11), 9);
      expect(star.ay).toBeCloseTo(0, 12);
    });

    it("should keep the halo centered on its planet when that planet moves", () => {
      const { universe, center, star } = createHaloUniverse(1e11);
      center.x += 5e10;
      center.y += 7e10;
      star.x = center.x;
      star.y = center.y + 1e11;
      universe.update_forces();
      expect(star.ax).toBeCloseTo(0, 12);
      expect(star.ay).toBeCloseTo(-halo_acceleration(1e11), 9);
    });

    it("should fade out far beyond the truncation radius", () => {
      const { universe, star } = createHaloUniverse(5e12);
      universe.update_forces();
      const far_field = (v0 * v0 * rt * rt) / (5e12 * 5e12 * 5e12);
      expect(star.ax / -far_field).toBeCloseTo(1, 2);
    });

    it("should conserve momentum by pulling the center in the opposite direction", () => {
      const { universe, center, star } = createHaloUniverse(1e11, 1e28);
      universe.update_forces();
      expect(center.ax).toBeGreaterThan(0);
      const net_force = center.mass * center.ax + star.mass * star.ax;
      expect(net_force / Math.abs(star.mass * star.ax)).toBeCloseTo(0, 12);
      expect(center.ay).toBeCloseTo(0, 12);
    });

    it("should not pull on the center when it has no mass", () => {
      const { universe, center, star } = createHaloUniverse(1e11);
      center.mass = 0;
      universe.update_forces();
      expect(center.ax).toBe(0);
      expect(star.ax).toBeLessThan(0);
    });

    it("should ignore a halo whose center is not part of the universe", () => {
      const universe = new Universe();
      universe.physics.G = 0;
      universe.generate_planets([{ name: "Star", mass: 1e10, radius: 1, x: 1e11 }]);
      universe.add_halo(new Planet("Elsewhere", 1e30, 1), v0, rc, rt);
      universe.update_forces();
      expect(universe.planets[0].ax).toBe(0);
    });

    it("should refuse a halo without a positive core or with a truncation radius inside the core", () => {
      const universe = new Universe();
      const center = new Planet("C", 1e30, 1);
      expect(() => universe.add_halo(center, v0, 0, rt)).toThrow("core_radius");
      expect(() => universe.add_halo(center, v0, rt, rt)).toThrow("truncation_radius");
      expect(() => universe.add_halo(center, v0, NaN, rt)).toThrow("core_radius");
      expect(universe.halos).toEqual([]);
    });

    it("should give a flat rotation curve between the core and the truncation radius", () => {
      const universe = new Universe();
      universe.physics.G = 0;
      const [center, star] = universe.generate_planets([
        { name: "Center", mass: 1e30, radius: 1 },
        { name: "Star", mass: 1e10, radius: 1 },
      ]);
      universe.add_halo(center, v0, 1e9, 1e13);
      universe.circularize(star, 1e11, center);
      expect(star.v / v0).toBeCloseTo(1, 3);
    });

    it("should circularize orbits with the pull of the halo included", () => {
      const universe = new Universe();
      const [center, star] = universe.generate_planets([
        { name: "Center", mass: 2e30, radius: 1 },
        { name: "Star", mass: 1, radius: 1 },
      ]);
      universe.add_halo(center, v0, rc, rt);
      universe.circularize(star, 1e11, center);
      universe.update_forces();
      expect((star.v * star.v) / 1e11).toBeCloseTo(Math.hypot(star.ax, star.ay), 12);
      // the halo makes the orbit faster than the center alone would
      expect(star.v).toBeGreaterThan(Math.sqrt((universe.physics.G * 2e30) / 1e11));
    });

    it("should only count the halos around the attractor when circularizing", () => {
      const orbital_speed = (halo_around: "A" | "B" | "both" | "none", attractor: "A" | "AB") => {
        const universe = new Universe();
        const [a, b, star] = universe.generate_planets([
          { name: "A", mass: 2e30, radius: 1, x: 0 },
          { name: "B", mass: 2e30, radius: 1, x: 1e12 },
          { name: "Star", mass: 1, radius: 1 },
        ]);
        if (halo_around === "A" || halo_around === "both") universe.add_halo(a, v0, rc, rt);
        if (halo_around === "B" || halo_around === "both") universe.add_halo(b, v0, rc, rt);
        universe.circularize(star, 1e11, attractor === "A" ? a : [a, b]);
        return star.v;
      };
      // a halo around the other galaxy does not change the orbit, but one around the attractor does
      expect(orbital_speed("both", "A")).toBeCloseTo(orbital_speed("A", "A"), 6);
      expect(orbital_speed("B", "A")).toBeCloseTo(orbital_speed("none", "A"), 6);
      expect(orbital_speed("A", "A")).toBeGreaterThan(orbital_speed("none", "A"));
      // around the center of mass of both, both halos count
      expect(orbital_speed("both", "AB")).toBeGreaterThan(orbital_speed("A", "AB"));
    });

    it("should add the halo's potential energy", () => {
      const { universe, star } = createHaloUniverse(1e11, 1e20);
      const k = rt * rt - rc * rc;
      const potential = 0.5 * v0 * v0 * ((rt * rt) / k) * Math.log((1e22 + rc * rc) / (1e22 + rt * rt));
      expect(universe.total_energy() / (star.mass * potential)).toBeCloseTo(1, 12);
      expect(potential).toBeLessThan(0);
    });

    it("should conserve energy of a star orbiting inside a halo", () => {
      const universe = new Universe();
      universe.physics.softening = 1e9;
      universe.physics.dt = 60 * 60 * 3;
      const [center, star] = universe.generate_planets([
        { name: "Center", mass: 2e30, radius: 1 },
        { name: "Star", mass: 1e24, radius: 1 },
      ]);
      universe.add_halo(center, v0, rc, rt);
      universe.circularize(star, 1e11, center);
      const initial_energy = universe.total_energy();

      for (let i = 0; i < 4000; i++) {
        universe.integration_step();
        expect(Math.abs((universe.total_energy() - initial_energy) / initial_energy)).toBeLessThan(1e-6);
      }
      // still on a circular orbit
      expect(Math.abs(Math.hypot(star.x - center.x, star.y - center.y) / 1e11 - 1)).toBeLessThan(1e-3);
    });
  });

  describe("core radius", () => {
    it("should default to a point mass and be copied from the spec", () => {
      const universe = new Universe();
      const [point, bulge] = universe.generate_planets([
        { name: "Point", mass: 1e30, radius: 1 },
        { name: "Bulge", mass: 1e30, radius: 1, core_radius: 4e10 },
      ]);
      expect(point.core_radius).toBe(0);
      expect(bulge.core_radius).toBe(4e10);
    });

    it("should soften the force with the core radii of both bodies", () => {
      const universe = new Universe();
      universe.physics.softening = 3e9;
      const [a, b] = universe.generate_planets([
        { name: "A", mass: 2e30, radius: 1, core_radius: 4e10 },
        { name: "B", mass: 1e30, radius: 1, x: 5e10, core_radius: 3e10 },
      ]);
      universe.update_forces();
      const softening2 = 3e9 ** 2 + 4e10 ** 2 + 3e10 ** 2;
      const d2 = 5e10 ** 2 + softening2;
      expect(b.ax / ((-universe.physics.G * 2e30 * 5e10) / d2 ** 1.5)).toBeCloseTo(1, 12);
      expect(a.ax / ((universe.physics.G * 1e30 * 5e10) / d2 ** 1.5)).toBeCloseTo(1, 12);
    });

    it("should pull much more weakly inside the core than a point mass would", () => {
      const pull = (core_radius: number) => {
        const universe = new Universe();
        universe.generate_planets([
          { name: "Sun", mass: 1e30, radius: 1, core_radius },
          { name: "P", mass: 1, radius: 1, x: 1e9 },
        ]);
        universe.update_forces();
        return Math.abs(universe.planets[1].ax);
      };
      expect(pull(5e10)).toBeLessThan(pull(0) / 1e3);
    });

    it("should circularize orbits with the cored force", () => {
      const universe = new Universe();
      const [sun, p] = universe.generate_planets([
        { name: "Sun", mass: 2e30, radius: 1, core_radius: 4e10 },
        { name: "P", mass: 1, radius: 1, core_radius: 1e10 },
      ]);
      universe.circularize(p, 6e10, sun);
      universe.update_forces();
      expect((p.v * p.v) / 6e10).toBeCloseTo(Math.hypot(p.ax, p.ay), 12);
      // a mass-weighted core for several attractors
      const [a, b] = universe.generate_planets([
        { name: "A", mass: 1e30, radius: 1, x: -1e10, core_radius: 4e10 },
        { name: "B", mass: 1e30, radius: 1, x: 1e10, core_radius: 0 },
      ]);
      universe.circularize(p, 6e10, [a, b]);
      expect(Number.isFinite(p.v)).toBe(true);
    });

    it("should include the cores in the potential energy and conserve energy through a bulge", () => {
      const universe = new Universe();
      universe.physics.dt = 60 * 60 * 3;
      const [sun, p] = universe.generate_planets([
        { name: "Sun", mass: 2e30, radius: 1, core_radius: 4e10 },
        { name: "P", mass: 1e24, radius: 1 },
      ]);
      universe.circularize(p, 3e10, sun);
      const initial_energy = universe.total_energy();
      const potential = -(universe.physics.G * 2e30 * 1e24) / Math.sqrt(9e20 + 1e12 + 1.6e21);
      expect(initial_energy - p.E_kin() - sun.E_kin()).toBeCloseTo(potential, -25);

      for (let i = 0; i < 4000; i++) {
        universe.integration_step();
        expect(Math.abs((universe.total_energy() - initial_energy) / initial_energy)).toBeLessThan(1e-8);
      }
      // the orbit stays circular inside the bulge
      expect(Math.abs(Math.hypot(p.x - sun.x, p.y - sun.y) / 3e10 - 1)).toBeLessThan(1e-3);
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
