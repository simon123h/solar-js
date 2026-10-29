import {
  ECCENTRICITY_RANGE,
  GALAXY_PRESETS,
  GalaxySettings,
  PERICENTER_RANGE,
  STAR_COUNTS,
  matching_preset,
  normalize_galaxy_settings,
} from "./galaxy-settings";

/** The panel in the page with the settings of the galaxy collision. */
export interface GalaxyPanel {
  /** Shows the settings in the controls of the panel. */
  show_settings(settings: GalaxySettings): void;
  /** Shows a message below the controls, e.g. why the settings could not be applied; an empty text clears it. */
  show_message(text: string): void;
  /** Opens or closes the panel. */
  set_open(open: boolean): void;
}

/** Finds an element of the page by its id. */
function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

/**
 * Connects the controls of the galaxy panel in the page.
 * @param initial - The settings to show at first.
 * @param on_change - Called with the new settings whenever the user changes a control.
 * @returns A handle to update the panel.
 */
export function init_galaxy_panel(initial: GalaxySettings, on_change: (settings: GalaxySettings) => void): GalaxyPanel {
  const panel = element<HTMLElement>("galaxy-panel");
  const preset = element<HTMLSelectElement>("galaxy-preset");
  const halo = element<HTMLInputElement>("galaxy-halo");
  const bulge = element<HTMLInputElement>("galaxy-bulge");
  const friction = element<HTMLInputElement>("galaxy-friction");
  const spins = [element<HTMLSelectElement>("galaxy-spin-0"), element<HTMLSelectElement>("galaxy-spin-1")];
  const encounter = element<HTMLSelectElement>("galaxy-encounter");
  const pericenter = element<HTMLInputElement>("galaxy-pericenter");
  const eccentricity = element<HTMLInputElement>("galaxy-eccentricity");
  const stars = element<HTMLSelectElement>("galaxy-stars");
  const message = element<HTMLElement>("galaxy-message");

  // fill the controls that depend on the model
  for (const { id, label } of GALAXY_PRESETS) preset.add(new Option(label, id));
  preset.add(new Option("Custom", "custom"));
  for (const count of STAR_COUNTS) stars.add(new Option(String(count), String(count)));
  for (const [input, range] of [
    [pericenter, PERICENTER_RANGE],
    [eccentricity, ECCENTRICITY_RANGE],
  ] as const) {
    input.min = String(range.min);
    input.max = String(range.max);
    input.step = String(range.step);
  }

  const show_values = () => {
    element<HTMLOutputElement>("galaxy-pericenter-value").value = `${pericenter.value} kpc`;
    element<HTMLOutputElement>("galaxy-eccentricity-value").value = Number(eccentricity.value).toFixed(2);
  };

  const show_settings = (settings: GalaxySettings) => {
    halo.checked = settings.halo;
    bulge.checked = settings.bulge;
    friction.checked = settings.friction;
    spins.forEach((select, i) => (select.value = String(settings.spins[i])));
    encounter.value = settings.custom_encounter ? "custom" : "fast";
    pericenter.value = String(settings.pericenter_kpc);
    eccentricity.value = String(settings.eccentricity);
    stars.value = String(settings.stars);
    preset.value = matching_preset(settings) ?? "custom";
    // friction needs halos, and the orbit only matters for a custom encounter
    friction.disabled = !settings.halo;
    pericenter.disabled = eccentricity.disabled = !settings.custom_encounter;
    show_values();
  };

  /** The settings that the controls show right now. */
  const read_settings = (): GalaxySettings =>
    normalize_galaxy_settings({
      halo: halo.checked,
      bulge: bulge.checked,
      friction: friction.checked,
      spins: spins.map((select) => Number(select.value)),
      custom_encounter: encounter.value === "custom",
      pericenter_kpc: Number(pericenter.value),
      eccentricity: Number(eccentricity.value),
      stars: Number(stars.value),
    });

  const changed = () => {
    const settings = read_settings();
    show_settings(settings);
    on_change(settings);
  };

  for (const control of [halo, bulge, friction, ...spins, encounter, stars]) control.addEventListener("change", changed);
  // sliders show their value while dragging, but only rebuild the scene when released
  for (const slider of [pericenter, eccentricity]) {
    slider.addEventListener("input", show_values);
    slider.addEventListener("change", changed);
  }
  preset.addEventListener("change", () => {
    const chosen = GALAXY_PRESETS.find((p) => p.id === preset.value);
    if (!chosen) return;
    show_settings(chosen.settings);
    on_change(chosen.settings);
  });

  show_settings(initial);
  return {
    show_settings,
    show_message: (text) => (message.textContent = text),
    set_open: (open) => (panel.hidden = !open),
  };
}
