import { describe, it, expect } from "vitest";
import {
  COSMIC_WEB_PARTICLE_COUNTS,
  DEFAULT_COSMIC_WEB_SETTINGS,
  normalize_cosmic_web_settings,
  cosmic_web_options,
} from "../src/scenarios/cosmic-web";

describe("cosmic-web-settings", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_COSMIC_WEB_SETTINGS).toEqual({
      particles: 625,
      roughness: 6,
      perturbation_amplitude: 0.4,
      expansion: 0.2,
    });
  });

  it("should contain standard particle options", () => {
    expect(COSMIC_WEB_PARTICLE_COUNTS).toContain(625);
  });

  it("should normalize valid settings", () => {
    expect(
      normalize_cosmic_web_settings({
        particles: 400,
        roughness: 8,
        perturbation_amplitude: 0.5,
        expansion: 0.6,
      }),
    ).toEqual({
      particles: 400,
      roughness: 8,
      perturbation_amplitude: 0.5,
      expansion: 0.6,
    });
  });

  it("should fallback on invalid values", () => {
    expect(normalize_cosmic_web_settings(null)).toEqual(DEFAULT_COSMIC_WEB_SETTINGS);
    expect(
      normalize_cosmic_web_settings({
        particles: -99,
        roughness: 999,
        perturbation_amplitude: 50,
        expansion: "expand",
      }),
    ).toEqual(DEFAULT_COSMIC_WEB_SETTINGS);
  });

  it("should produce cosmic_web_options matching normalized settings", () => {
    const opts = cosmic_web_options({
      particles: 900,
      roughness: 4,
      perturbation_amplitude: 0.3,
      expansion: 0.1,
    });
    expect(opts).toEqual({
      particles: 900,
      roughness: 4,
      perturbation_amplitude: 0.3,
      expansion: 0.1,
    });
  });
});
