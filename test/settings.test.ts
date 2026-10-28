import { describe, it, expect, vi, afterEach } from "vitest";
import { SETTINGS_KEY, SettingsStorage, get_local_storage, load_settings, save_settings } from "../src/settings";

const defaults = { universe: "solar-system", speed: 1 };
const is_valid = {
  universe: (value: string) => ["solar-system", "galaxy-collision"].includes(value),
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
    save_settings(storage, { universe: "galaxy-collision", speed: 2 });
    expect(load_settings(storage, defaults, is_valid)).toEqual({ universe: "galaxy-collision", speed: 2 });
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
    });
    const wrong_types = JSON.stringify({ universe: 5, speed: "2" });
    expect(load_settings(fake_storage({ [SETTINGS_KEY]: wrong_types }), defaults, is_valid)).toEqual(defaults);
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
