/** Real-world units for the readouts of a scene whose simulated quantities stand for other scales. */
export interface Units {
  /** The name of the time unit, e.g. "Myr". */
  time_unit: string;
  /** How many simulated seconds make one time unit. */
  seconds_per_time_unit: number;
  /** The name of the length unit, e.g. "kpc". */
  length_unit: string;
  /** How many simulated meters make one length unit. */
  meters_per_length_unit: number;
}

/**
 * Formats the simulated time for the statistics display.
 * @param seconds - The simulated time in seconds.
 * @param units - The units to show the time in, or null for days.
 * @returns For example "Day 12" or "520 Myr".
 */
export function format_time(seconds: number, units: Units | null): string {
  if (units === null) return "Day " + (seconds / 60 / 60 / 24).toFixed(0);
  return (seconds / units.seconds_per_time_unit).toFixed(0) + " " + units.time_unit;
}

/** A scale bar to draw on the canvas. */
export interface ScaleBar {
  /** The length of the bar in pixels. */
  length_px: number;
  /** The label of the bar, e.g. "10 kpc". */
  label: string;
}

/**
 * Chooses a scale bar of a round length (1, 2 or 5 times a power of ten) that fits in a number of pixels.
 * @param meters_per_pixel - The current zoom: simulated meters per canvas pixel.
 * @param units - The units to label the bar in, or null if the scene has none.
 * @param max_px - The longest the bar may be, in pixels.
 * @returns The scale bar, or null if the scene has no units.
 */
export function scale_bar(meters_per_pixel: number, units: Units | null, max_px: number = 150): ScaleBar | null {
  if (units === null) return null;
  const max_length = (max_px * meters_per_pixel) / units.meters_per_length_unit;
  const power = Math.pow(10, Math.floor(Math.log10(max_length)));
  const mantissa = max_length / power;
  const length = (mantissa >= 5 ? 5 : mantissa >= 2 ? 2 : 1) * power;
  return {
    length_px: (length * units.meters_per_length_unit) / meters_per_pixel,
    label: Number(length.toPrecision(2)) + " " + units.length_unit,
  };
}
