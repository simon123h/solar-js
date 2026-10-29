import { describe, it, expect } from "vitest";
import { Units, format_time, scale_bar } from "../src/units";

const units: Units = { time_unit: "Myr", seconds_per_time_unit: 5e4, length_unit: "kpc", meters_per_length_unit: 1e10 };

describe("format_time", () => {
  it("should show days without units", () => {
    expect(format_time(0, null)).toBe("Day 0");
    expect(format_time(3.4 * 86400, null)).toBe("Day 3");
    expect(format_time(12 * 86400, null)).toBe("Day 12");
  });

  it("should show the time in the units of the scene", () => {
    expect(format_time(0, units)).toBe("0 Myr");
    expect(format_time(5e4 * 520.4, units)).toBe("520 Myr");
  });
});

describe("scale_bar", () => {
  it("should have no scale bar without units", () => {
    expect(scale_bar(1e9, null)).toBeNull();
  });

  it("should pick a round length that fits in the given width", () => {
    // 1e9 m per pixel is 0.1 kpc per pixel, so 150 px are 15 kpc
    const bar = scale_bar(1e9, units, 150)!;
    expect(bar.label).toBe("10 kpc");
    expect(bar.length_px).toBeCloseTo(100, 9);
  });

  it.each([
    [1e9, 150, "10 kpc"],
    [2e9, 150, "20 kpc"],
    [3e9, 150, "20 kpc"],
    [3.5e9, 150, "50 kpc"],
    [1e8, 150, "1 kpc"],
    [5e7, 150, "0.5 kpc"],
    [2e7, 150, "0.2 kpc"],
    [1e7, 150, "0.1 kpc"],
    [1e10, 150, "100 kpc"],
  ])("should label a zoom of %d m per pixel with a width of %d px as %s", (meters_per_pixel, max_px, label) => {
    expect(scale_bar(meters_per_pixel, units, max_px)!.label).toBe(label);
  });

  it("should never be longer than the allowed width", () => {
    for (let zoom = 1e6; zoom < 1e12; zoom *= 1.37) {
      const bar = scale_bar(zoom, units, 150)!;
      expect(bar.length_px).toBeLessThanOrEqual(150 + 1e-9);
      // and it should use a good part of it: the next round length would not fit
      expect(bar.length_px).toBeGreaterThan(150 / 2.5 - 1e-9);
    }
  });
});
