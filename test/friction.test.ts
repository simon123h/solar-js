import { describe, it, expect } from "vitest";
import { coulomb_logarithm, friction_factor } from "../src/core/friction";

describe("friction_factor", () => {
  it("should be zero at rest", () => {
    expect(friction_factor(0)).toBe(0);
  });

  it("should match erf(x) - 2x/sqrt(pi) exp(-x^2) at known points", () => {
    // reference values from the error function: erf(1) = 0.842700793, erf(2) = 0.995322265
    expect(friction_factor(1)).toBeCloseTo(0.842700793 - (2 / Math.sqrt(Math.PI)) * Math.exp(-1), 6);
    expect(friction_factor(2)).toBeCloseTo(0.995322265 - (4 / Math.sqrt(Math.PI)) * Math.exp(-4), 6);
  });

  it("should rise like x^3 for slow bodies", () => {
    // the leading term is 4 / (3 sqrt(pi)) x^3
    for (const x of [0.01, 0.05, 0.1]) {
      expect(friction_factor(x) / ((4 / (3 * Math.sqrt(Math.PI))) * x ** 3)).toBeCloseTo(1, 1);
    }
  });

  it("should be continuous where the series hands over to the error function", () => {
    expect(friction_factor(0.4999999)).toBeCloseTo(friction_factor(0.5000001), 6);
    // and agree with a direct evaluation on both sides
    expect(friction_factor(0.45)).toBeCloseTo(0.4752 - (0.9 / Math.sqrt(Math.PI)) * Math.exp(-0.2025), 3);
  });

  it("should increase monotonically towards 1", () => {
    let previous = 0;
    for (let x = 0.05; x < 6; x += 0.05) {
      const value = friction_factor(x);
      expect(value).toBeGreaterThan(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
    expect(friction_factor(6)).toBeCloseTo(1, 6);
  });
});

describe("coulomb_logarithm", () => {
  const G = 6.674e-11;

  it("should grow with the largest impact parameter and with speed", () => {
    expect(coulomb_logarithm(2e11, 3e4, G, 1e30)).toBeGreaterThan(coulomb_logarithm(1e11, 3e4, G, 1e30));
    expect(coulomb_logarithm(1e11, 6e4, G, 1e30)).toBeGreaterThan(coulomb_logarithm(1e11, 3e4, G, 1e30));
  });

  it("should fade out for a body that is very massive for its surroundings", () => {
    expect(coulomb_logarithm(1e10, 1e4, G, 1e32)).toBeLessThan(1e-3);
    expect(coulomb_logarithm(1e10, 1e4, G, 1e32)).toBeGreaterThan(0);
  });

  it("should reduce to ln(Lambda) when Lambda is large", () => {
    const lambda = (1e12 * 1e5 ** 2) / (G * 1e20);
    expect(coulomb_logarithm(1e12, 1e5, G, 1e20)).toBeCloseTo(Math.log(lambda), 6);
  });
});
