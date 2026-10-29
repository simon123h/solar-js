import { describe, it, expect } from "vitest";
import {
  DEFAULT_N_BODY_SETTINGS,
  N_BODY_COUNTS,
  N_BODY_VELOCITY_OPTIONS,
  normalize_n_body_settings,
  n_body_options,
} from "../src/scenarios/n-body";

describe("n-body-settings", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_N_BODY_SETTINGS).toEqual({
      bodies: 400,
      velocity_arrangement: "stationary",
      velocity_scale: 1.0,
      varied_masses: false,
    });
  });

  it("should contain supported velocity options and body counts", () => {
    expect(N_BODY_COUNTS).toContain(400);
    expect(N_BODY_VELOCITY_OPTIONS.map((o) => o.id)).toEqual([
      "stationary",
      "circular",
      "inward",
      "outward",
      "random",
    ]);
  });

  it("should normalize valid settings", () => {
    expect(
      normalize_n_body_settings({
        bodies: 100,
        velocity_arrangement: "circular",
        velocity_scale: 1.5,
        varied_masses: true,
      }),
    ).toEqual({
      bodies: 100,
      velocity_arrangement: "circular",
      velocity_scale: 1.5,
      varied_masses: true,
    });
  });

  it("should fallback on invalid values", () => {
    expect(normalize_n_body_settings(null)).toEqual(DEFAULT_N_BODY_SETTINGS);
    expect(
      normalize_n_body_settings({
        bodies: -10,
        velocity_arrangement: "unknown-direction",
        velocity_scale: "fast",
        varied_masses: "yes",
      }),
    ).toEqual(DEFAULT_N_BODY_SETTINGS);
  });

  it("should produce n_body_options matching normalized settings", () => {
    const opts = n_body_options({
      bodies: 200,
      velocity_arrangement: "inward",
      velocity_scale: 2.0,
      varied_masses: false,
    });
    expect(opts).toEqual({
      bodies: 200,
      velocity_arrangement: "inward",
      velocity_scale: 2.0,
      varied_masses: false,
    });
  });
});
