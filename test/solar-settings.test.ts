import { describe, it, expect } from "vitest";
import {
  DEFAULT_SOLAR_SETTINGS,
  normalize_solar_settings,
  solar_options,
} from "../src/solar-settings";

describe("solar-settings", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_SOLAR_SETTINGS).toEqual({
      asteroids: 400,
      include_pluto: true,
    });
  });

  it("should normalize valid settings", () => {
    expect(
      normalize_solar_settings({
        asteroids: 1500,
        include_pluto: false,
      }),
    ).toEqual({
      asteroids: 1500,
      include_pluto: false,
    });
  });

  it("should fallback on invalid values", () => {
    expect(normalize_solar_settings(null)).toEqual(DEFAULT_SOLAR_SETTINGS);
    expect(
      normalize_solar_settings({
        asteroids: -50,
        include_pluto: "yes",
      }),
    ).toEqual(DEFAULT_SOLAR_SETTINGS);
  });

  it("should produce solar_options matching normalized settings", () => {
    const opts = solar_options({
      asteroids: 200,
      include_pluto: false,
    });
    expect(opts).toEqual({
      asteroids: 200,
      include_pluto: false,
    });
  });
});
