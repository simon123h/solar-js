import { SOLAR_ASTEROID_COUNTS, SolarSystemSettings, normalize_solar_settings } from "./solar-settings";

/** The panel in the page with the settings of the solar system. */
export interface SolarPanel {
  /** Shows the settings in the controls of the panel. */
  show_settings(settings: SolarSystemSettings): void;
  /** Opens or closes the panel. */
  set_open(open: boolean): void;
}

/** Finds an element of the page by its id. */
function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

/**
 * Connects the controls of the solar system panel in the page.
 * @param initial - The settings to show at first.
 * @param on_change - Called with the new settings whenever the user changes a control.
 * @returns A handle to update the panel.
 */
export function init_solar_panel(
  initial: SolarSystemSettings,
  on_change: (settings: SolarSystemSettings) => void,
): SolarPanel {
  const panel = element<HTMLElement>("solar-panel");
  const asteroids = element<HTMLSelectElement>("solar-asteroids");
  const pluto = element<HTMLInputElement>("solar-pluto");

  for (const count of SOLAR_ASTEROID_COUNTS) {
    asteroids.add(new Option(count === 0 ? "None" : String(count), String(count)));
  }

  const show_settings = (settings: SolarSystemSettings) => {
    asteroids.value = String(settings.asteroids);
    pluto.checked = settings.include_pluto;
  };

  const read_settings = (): SolarSystemSettings =>
    normalize_solar_settings({
      asteroids: Number(asteroids.value),
      include_pluto: pluto.checked,
    });

  const changed = () => {
    const settings = read_settings();
    show_settings(settings);
    on_change(settings);
  };

  asteroids.addEventListener("change", changed);
  pluto.addEventListener("change", changed);

  show_settings(initial);
  return {
    show_settings,
    set_open: (open) => (panel.hidden = !open),
  };
}
