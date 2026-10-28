import { describe, it, expect } from "vitest";
import { seeded_random } from "../src/random";

describe("seeded_random", () => {
  it("should produce the same sequence for the same seed", () => {
    const a = seeded_random(42);
    const b = seeded_random(42);
    expect(Array.from({ length: 10 }, a)).toEqual(Array.from({ length: 10 }, b));
  });

  it("should produce different sequences for different seeds", () => {
    expect(seeded_random(1)()).not.toBe(seeded_random(2)());
  });

  it("should stay within [0, 1)", () => {
    const random = seeded_random(7);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
