import { describe, it, expect } from "vitest";
import {
  BINARY_GALAXY_SEPARATION_RANGE,
  BINARY_GALAXY_STAR_COUNTS,
  DEFAULT_BINARY_GALAXY_SETTINGS,
  binary_galaxy_options,
  normalize_binary_galaxy_settings,
} from "../src/binary-galaxy-settings";

describe("binary-galaxy-settings", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_BINARY_GALAXY_SETTINGS).toEqual({
      separation_kpc: 4.0,
      mass_ratio: 0.8,
      stars: 3000,
      halo: true,
    });
  });

  it("should list valid star options and separation ranges", () => {
    expect(BINARY_GALAXY_STAR_COUNTS).toContain(3000);
    expect(BINARY_GALAXY_SEPARATION_RANGE.min).toBeLessThan(BINARY_GALAXY_SEPARATION_RANGE.max);
  });

  it("should normalize valid settings", () => {
    expect(
      normalize_binary_galaxy_settings({
        separation_kpc: 8.0,
        mass_ratio: 0.5,
        stars: 2000,
        halo: false,
      }),
    ).toEqual({
      separation_kpc: 8.0,
      mass_ratio: 0.5,
      stars: 2000,
      halo: false,
    });
  });

  it("should fallback on invalid settings", () => {
    expect(normalize_binary_galaxy_settings(null)).toEqual(DEFAULT_BINARY_GALAXY_SETTINGS);
    expect(
      normalize_binary_galaxy_settings({
        separation_kpc: -5,
        mass_ratio: 100,
        stars: "many",
        halo: "yes",
      }),
    ).toEqual(DEFAULT_BINARY_GALAXY_SETTINGS);
  });

  it("should produce options matching normalized settings", () => {
    const opts = binary_galaxy_options({
      separation_kpc: 6.0,
      mass_ratio: 0.9,
      stars: 1000,
      halo: true,
    });
    expect(opts).toEqual({
      separation_kpc: 6.0,
      mass_ratio: 0.9,
      stars: 1000,
      halo: true,
    });
  });
});
