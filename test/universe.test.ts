import { describe, it, expect } from "vitest";
import { Universe } from "../src/universe";
import { Planet } from "../src/planet";

describe("Universe", () => {
  it("should initialize correctly", () => {
    const universe = new Universe();
    expect(universe.planets).toEqual([]);
    expect(universe.physics.time).toBe(0);
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

  it("should circularize orbit", () => {
    const universe = new Universe();
    // Attractor at 0,0
    const sun = new Planet("Sun", 1e30, 10);
    sun.x = 0;
    sun.y = 0;
    universe.planets.push(sun);

    const earth = new Planet("Earth", 1e24, 5);
    universe.planets.push(earth);

    const orbitRadius = 1e11;
    universe.circularize(earth, orbitRadius, sun);

    // Check distance
    const dist = Math.sqrt(earth.x * earth.x + earth.y * earth.y);
    expect(dist).toBeCloseTo(orbitRadius, -5); // approx equal

    // Check velocity magnitude (v = sqrt(GM/r))
    const expectedV = Math.sqrt((universe.physics.G * sun.mass) / orbitRadius);
    expect(earth.v).toBeCloseTo(expectedV, -5);
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

  it("should calculate gravitational forces correctly", () => {
    const universe = new Universe();
    // Place two planets distance d apart on x-axis
    const m1 = 1e30;
    const m2 = 1e24;
    const d = 1e11;

    universe.generate_planets([
      { name: "Sun", mass: m1, x: 0, y: 0, radius: 10 },
      { name: "Earth", mass: m2, x: d, y: 0, radius: 5 },
    ]);

    universe.update_forces();

    const sun = universe.planets[0];
    const earth = universe.planets[1];

    // F = G * m1 * m2 / d^2
    const F = (universe.physics.G * m1 * m2) / (d * d);

    // a_sun = F / m1
    const expected_ax_sun = F / m1;
    // a_earth = -F / m2 (pulling back towards 0)
    const expected_ax_earth = -F / m2;

    expect(sun.ax).toBeCloseTo(expected_ax_sun, -10); // Use loose precision for floating point
    expect(sun.ay).toBe(0);
    expect(earth.ax).toBeCloseTo(expected_ax_earth, -10);
    expect(earth.ay).toBe(0);
  });
});
