import { describe, it, expect } from "vitest";
import { Universe } from "../src/universe";
import { Planet } from "../src/planet";

describe("Universe", () => {
  it("should initialize correctly", () => {
    const universe = new Universe();
    expect(universe.planets).toEqual([]);
    expect(universe.physics.time).toBe(0);
    expect(universe.physics.bbox).toBeUndefined();
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
    universe.generate_planets([
        { name: "Dummy", mass: 100, radius: 10, is_dummy: true }
    ]);
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
        { name: "ND2", mass: m, x: -d, y: 0, radius: 10, is_dummy: false }
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
          { name: "", mass: 100, radius: 10 }
      ]);
      const dict = universe.as_dict();
      expect(dict["Named"]).toBeDefined();
      expect(dict[""]).toBeUndefined();
      expect(Object.keys(dict).length).toBe(1);
  });
  
  it("should handle bbox in update_forces", () => {
     const universe = new Universe();
     // Set bbox to something specific
     universe.physics.bbox = 0.5;
     universe.generate_planets([
         { name: "P1", mass: 1e30, radius: 10, x: 0, y: 0 },
         { name: "P2", mass: 1e30, radius: 10, x: 0.1, y: 0 } // Very close
     ]);
     // Force calculation uses max(dist, radius_term)
     // This test ensures the code path using bbox is executed
     // We just check it doesn't crash and computes something
     universe.update_forces();
     expect(universe.planets[0].ax).not.toBeNaN();
  });
});