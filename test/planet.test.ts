import { describe, it, expect } from "vitest";
import { Planet } from "../src/planet";

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
