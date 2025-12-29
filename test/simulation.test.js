import { describe, it, expect } from "vitest";
import { Universe } from "../js/universe.js";
import { Planet } from "../js/planet.js";
import createSolarSystem from "../js/universes/solar-system.js";
import createGalaxyCollision from "../js/universes/galaxy-collision.js";
import createNBodyUniverse from "../js/universes/n-body-universe.js";

describe("Planet", () => {
    it("should calculate velocity magnitude", () => {
        const planet = new Planet("Test", 100, 10);
        planet.vx = 3;
        planet.vy = 4;
        expect(planet.v).toBe(5);
    });

    it("should calculate kinetic energy", () => {
        const planet = new Planet("Test", 100, 10);
        planet.vx = 3;
        planet.vy = 4;
        // E = 0.5 * m * v^2 = 0.5 * 100 * 25 = 1250
        expect(planet.E_kin()).toBe(1250);
    });
});

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
            { name: "P2", mass: 200, radius: 20, color: "#f00" }
        ]);
        expect(universe.planets.length).toBe(2);
        expect(universe.planets[0].name).toBe("P1");
        expect(universe.planets[1].color).toBe("#f00");
    });

    it("should find planet by name", () => {
        const universe = new Universe();
        universe.generate_planets([
            { name: "P1", mass: 100, radius: 10 },
            { name: "P2", mass: 200, radius: 20 }
        ]);
        expect(universe.get_planet_by_name("P1")).toBeDefined();
        expect(universe.get_planet_by_name("P3")).toBeNull();
    });

    it("should circularize orbit", () => {
        const universe = new Universe();
        // Attractor at 0,0
        const sun = new Planet("Sun", 1e30, 10);
        sun.x = 0; sun.y = 0;
        universe.planets.push(sun);

        const earth = new Planet("Earth", 1e24, 5);
        universe.planets.push(earth);

        const orbitRadius = 1e11;
        universe.circularize(earth, orbitRadius, sun);

        // Check distance
        const dist = Math.sqrt(earth.x * earth.x + earth.y * earth.y);
        expect(dist).toBeCloseTo(orbitRadius, -5); // approx equal

        // Check velocity magnitude (v = sqrt(GM/r))
        const expectedV = Math.sqrt(universe.physics.G * sun.mass / orbitRadius);
        expect(earth.v).toBeCloseTo(expectedV, -5);
    });

    it("should run integration steps and update time", () => {
        const universe = new Universe();
        universe.generate_planets([
             { name: "P1", mass: 1e30, radius: 10, x: 0, y:0 },
             { name: "P2", mass: 1e24, radius: 5, x: 1e11, y:0, vy: 30000 }
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
        expect(p1.trace.length).toBe(1);
        
        // Advance time and trace again
        universe.physics.time += 1000;
        p1.x = 10;
        universe.manage_trace();
        expect(p1.trace.length).toBe(2);
    });

    it("should calculate gravitational forces correctly", () => {
        const universe = new Universe();
        // Place two planets distance d apart on x-axis
        const m1 = 1e30;
        const m2 = 1e24;
        const d = 1e11;
        
        universe.generate_planets([
            { name: "Sun", mass: m1, x: 0, y: 0, radius: 10 },
            { name: "Earth", mass: m2, x: d, y: 0, radius: 5 }
        ]);
        
        universe.update_forces();
        
        const sun = universe.planets[0];
        const earth = universe.planets[1];
        
        // F = G * m1 * m2 / d^2
        const F = universe.physics.G * m1 * m2 / (d * d);
        
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

describe("Factories", () => {
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
    });

    it("should create N-Body Universe", () => {
        const universe = createNBodyUniverse();
        expect(universe.planets.length).toBeGreaterThan(0);
    });
});