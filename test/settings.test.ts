import { describe, it, expect, vi, afterEach } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  Settings,
  SettingsStorage,
  get_local_storage,
  load_settings,
  save_settings,
} from "../src/settings";
import { DEFAULT_GALAXY_SETTINGS, GALAXY_PRESETS } from "../src/galaxy-settings";

const defaults: Settings = DEFAULT_SETTINGS;
const is_valid = {
  universe: (value: string) => ["solar-system", "galaxy-collision", "cosmic-web"].includes(value),
  speed: (value: number) => [0.5, 1, 2].includes(value),
};

function fake_storage(initial: Record<string, string> = {}): SettingsStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("settings", () => {
  it("should round-trip saved settings", () => {
    const storage = fake_storage();
    const merger = GALAXY_PRESETS[2].settings;
    save_settings(storage, {
      universe: "galaxy-collision",
      speed: 2,
      galaxy: merger,
      solar: { asteroids: 100, include_pluto: false },
      nbody: { bodies: 200, velocity_arrangement: "circular", velocity_scale: 1.5, varied_masses: true },
      cosmic: { particles: 400, roughness: 4, perturbation_amplitude: 0.3, expansion: 0.5 },
    });
    expect(load_settings(storage, defaults, is_valid)).toEqual({
      universe: "galaxy-collision",
      speed: 2,
      galaxy: merger,
      solar: { asteroids: 100, include_pluto: false },
      nbody: { bodies: 200, velocity_arrangement: "circular", velocity_scale: 1.5, varied_masses: true },
      cosmic: { particles: 400, roughness: 4, perturbation_amplitude: 0.3, expansion: 0.5 },
    });
  });

  it("should use the defaults when nothing is saved or there is no storage", () => {
    expect(load_settings(fake_storage(), defaults, is_valid)).toEqual(defaults);
    expect(load_settings(null, defaults, is_valid)).toEqual(defaults);
  });

  it("should use the defaults for corrupt data", () => {
    for (const bad of ["not json", "42", '"text"', "[]", "{"]) {
      expect(load_settings(fake_storage({ [SETTINGS_KEY]: bad }), defaults, is_valid)).toEqual(defaults);
    }
  });

  it("should ignore values that are no longer valid, but keep the valid ones", () => {
    const saved = JSON.stringify({ universe: "removed-universe", speed: 2 });
    expect(load_settings(fake_storage({ [SETTINGS_KEY]: saved }), defaults, is_valid)).toEqual({
      universe: "solar-system",
      speed: 2,
      galaxy: DEFAULT_GALAXY_SETTINGS,
      solar: defaults.solar,
      nbody: defaults.nbody,
      cosmic: defaults.cosmic,
    });
    const wrong_types = JSON.stringify({ universe: 5, speed: "2" });
    expect(load_settings(fake_storage({ [SETTINGS_KEY]: wrong_types }), defaults, is_valid)).toEqual(defaults);
  });

  describe("the galaxy collision settings", () => {
    const load = (saved: unknown, valid = is_valid) =>
      load_settings(fake_storage({ [SETTINGS_KEY]: JSON.stringify(saved) }), defaults, valid);

    it("should keep the galaxy settings while another universe is shown", () => {
      const retrograde = GALAXY_PRESETS[3].settings;
      const loaded = load({ universe: "solar-system", speed: 1, galaxy: retrograde });
      expect(loaded.universe).toBe("solar-system");
      expect(loaded.galaxy).toEqual(retrograde);
    });

    it("should use the defaults for galaxy settings that are missing or damaged, part by part", () => {
      expect(load({ universe: "galaxy-collision", speed: 1 }).galaxy).toEqual(DEFAULT_GALAXY_SETTINGS);
      expect(load({ galaxy: "nonsense" }).galaxy).toEqual(DEFAULT_GALAXY_SETTINGS);
      const partly = load({ galaxy: { halo: true, stars: "many", spins: [-1, 7] } }).galaxy;
      expect(partly).toEqual({ ...DEFAULT_GALAXY_SETTINGS, halo: true, spins: [-1, 1] });
    });

    it.each([
      ["galaxy-collision-halo", 1],
      ["galaxy-collision-realistic", 2],
      ["galaxy-collision-retrograde", 3],
    ])("should turn the old universe %s into the merged one with the matching settings", (old_name, preset_index) => {
      const loaded = load({ universe: old_name, speed: 2 });
      expect(loaded.universe).toBe("galaxy-collision");
      expect(loaded.galaxy).toEqual(GALAXY_PRESETS[preset_index].settings);
      expect(loaded.speed).toBe(2);
    });

    it("should prefer galaxy settings that were saved together with an old universe name", () => {
      const loaded = load({ universe: "galaxy-collision-halo", galaxy: GALAXY_PRESETS[3].settings });
      expect(loaded.galaxy).toEqual(GALAXY_PRESETS[3].settings);
    });

    it("should not choose the merged universe if it no longer exists, but still keep the settings", () => {
      const loaded = load({ universe: "galaxy-collision-halo" }, { ...is_valid, universe: (value) => value === "solar-system" });
      expect(loaded.universe).toBe("solar-system");
      expect(loaded.galaxy).toEqual(GALAXY_PRESETS[1].settings);
    });

    it("should not mistake the names of object properties for old universes", () => {
      for (const name of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
        const loaded = load({ universe: name });
        expect(loaded.universe).toBe("solar-system");
        expect(loaded.galaxy).toEqual(DEFAULT_GALAXY_SETTINGS);
      }
    });
  });

  it("should survive storage that throws", () => {
    const broken: SettingsStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(load_settings(broken, defaults, is_valid)).toEqual(defaults);
    expect(() => save_settings(broken, defaults)).not.toThrow();
    expect(() => save_settings(null, defaults)).not.toThrow();
  });

  describe("get_local_storage", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("should return the browser's localStorage", () => {
      const storage = fake_storage();
      vi.stubGlobal("window", { localStorage: storage });
      expect(get_local_storage()).toBe(storage);
    });

    it("should return null when accessing localStorage throws", () => {
      vi.stubGlobal("window", {
        get localStorage(): Storage {
          throw new Error("SecurityError");
        },
      });
      expect(get_local_storage()).toBeNull();
    });
  });
});
