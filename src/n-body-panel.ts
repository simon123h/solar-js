import {
  N_BODY_COUNTS,
  N_BODY_VELOCITY_OPTIONS,
  N_BODY_VELOCITY_SCALE_RANGE,
  NBodySettings,
  NBodyVelocityArrangement,
  normalize_n_body_settings,
} from "./n-body-settings";

/** The panel in the page with the settings of the n-body universe. */
export interface NBodyPanel {
  /** Shows the settings in the controls of the panel. */
  show_settings(settings: NBodySettings): void;
  /** Opens or closes the panel. */
  set_open(open: boolean): void;
}

/** Finds an element of the page by its id. */
function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

/**
 * Connects the controls of the n-body panel in the page.
 * @param initial - The settings to show at first.
 * @param on_change - Called with the new settings whenever the user changes a control.
 * @returns A handle to update the panel.
 */
export function init_n_body_panel(
  initial: NBodySettings,
  on_change: (settings: NBodySettings) => void,
): NBodyPanel {
  const panel = element<HTMLElement>("n-body-panel");
  const bodies = element<HTMLSelectElement>("n-body-count");
  const velocity = element<HTMLSelectElement>("n-body-velocity");
  const velocityScale = element<HTMLInputElement>("n-body-velocity-scale");
  const velocityScaleValue = element<HTMLOutputElement>("n-body-velocity-scale-value");
  const variedMasses = element<HTMLInputElement>("n-body-varied-masses");

  for (const count of N_BODY_COUNTS) {
    bodies.add(new Option(String(count), String(count)));
  }

  for (const opt of N_BODY_VELOCITY_OPTIONS) {
    velocity.add(new Option(opt.label, opt.id));
  }

  velocityScale.min = String(N_BODY_VELOCITY_SCALE_RANGE.min);
  velocityScale.max = String(N_BODY_VELOCITY_SCALE_RANGE.max);
  velocityScale.step = String(N_BODY_VELOCITY_SCALE_RANGE.step);

  const show_values = () => {
    velocityScaleValue.value = `${Number(velocityScale.value).toFixed(1)}x`;
  };

  const show_settings = (settings: NBodySettings) => {
    bodies.value = String(settings.bodies);
    velocity.value = settings.velocity_arrangement;
    velocityScale.value = String(settings.velocity_scale);
    velocityScale.disabled = settings.velocity_arrangement === "stationary";
    variedMasses.checked = settings.varied_masses;
    show_values();
  };

  const read_settings = (): NBodySettings =>
    normalize_n_body_settings({
      bodies: Number(bodies.value),
      velocity_arrangement: velocity.value as NBodyVelocityArrangement,
      velocity_scale: Number(velocityScale.value),
      varied_masses: variedMasses.checked,
    });

  const changed = () => {
    const settings = read_settings();
    show_settings(settings);
    on_change(settings);
  };

  bodies.addEventListener("change", changed);
  velocity.addEventListener("change", changed);
  velocityScale.addEventListener("input", show_values);
  velocityScale.addEventListener("change", changed);
  variedMasses.addEventListener("change", changed);

  show_settings(initial);
  return {
    show_settings,
    set_open: (open) => (panel.hidden = !open),
  };
}
