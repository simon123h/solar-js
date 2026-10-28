import { describe, it, expect } from "vitest";
import createSolarSystem from "../src/universes/solar-system";
import createGalaxyCollision from "../src/universes/galaxy-collision";
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
