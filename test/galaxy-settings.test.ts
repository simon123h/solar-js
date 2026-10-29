import { describe, it, expect } from "vitest";
import {
  DEFAULT_GALAXY_SETTINGS,
  ECCENTRICITY_RANGE,
  GALAXY_PRESETS,
  GalaxySettings,
  LEGACY_GALAXY_UNIVERSES,
  PERICENTER_RANGE,
  STAR_COUNTS,
  encounter_problem,
  galaxy_options,
  matching_preset,
  normalize_galaxy_settings,
  createGalaxyCollision,
  GALAXY_BULGE_RADIUS,
  GALAXY_ENCOUNTER,
  GALAXY_HALO,
  GALAXY_UNITS,
} from "../src/scenarios/galaxy-collision";
import { seeded_random } from "../src/core/random";
import { Universe } from "../src/core/universe";

/** Everything about a universe that the simulation depends on, to compare two of them. */
function state(universe: Universe) {
  return {
    planets: universe.planets.map((p) => [p.name, p.x, p.y, p.vx, p.vy, p.mass, p.core_radius, p.is_dummy]),
    halos: universe.halos.map((h) => [h.center.name, h.v0, h.core_radius, h.truncation_radius, h.friction]),
  };
}

const preset = (id: string): GalaxySettings => GALAXY_PRESETS.find((p) => p.id === id)!.settings;

describe("galaxy presets", () => {
  it("should reproduce the scenarios they replace", () => {
    const create = (options = {}) => state(createGalaxyCollision(seeded_random(5), options));
    const create_from = (settings: GalaxySettings) => state(createGalaxyCollision(seeded_random(5), galaxy_options(settings)));

    expect(create_from(preset("classic"))).toEqual(create());
    expect(create_from(preset("halo"))).toEqual(create({ halo: GALAXY_HALO }));
    expect(create_from(preset("merger"))).toEqual(
      create({ halo: GALAXY_HALO, bulge_radius: GALAXY_BULGE_RADIUS, friction: true, encounter: GALAXY_ENCOUNTER }),
    );
    expect(create_from(preset("retrograde"))).toEqual(
      create({ halo: GALAXY_HALO, bulge_radius: GALAXY_BULGE_RADIUS, friction: true, spins: [-1, -1], encounter: GALAXY_ENCOUNTER }),
    );
  });

  it("should have distinct ids and labels, and be recognized as themselves", () => {
    expect(new Set(GALAXY_PRESETS.map((p) => p.id)).size).toBe(GALAXY_PRESETS.length);
    expect(new Set(GALAXY_PRESETS.map((p) => p.label)).size).toBe(GALAXY_PRESETS.length);
    for (const p of GALAXY_PRESETS) expect(matching_preset(p.settings)).toBe(p.id);
  });

  it("should map the old separate scenarios onto presets", () => {
    expect(Object.keys(LEGACY_GALAXY_UNIVERSES).sort()).toEqual([
      "galaxy-collision-halo",
      "galaxy-collision-realistic",
      "galaxy-collision-retrograde",
    ]);
    expect(matching_preset(LEGACY_GALAXY_UNIVERSES["galaxy-collision-halo"])).toBe("halo");
    expect(matching_preset(LEGACY_GALAXY_UNIVERSES["galaxy-collision-realistic"])).toBe("merger");
    expect(matching_preset(LEGACY_GALAXY_UNIVERSES["galaxy-collision-retrograde"])).toBe("retrograde");
  });

  it("should start with the plain scene, as the universe always did", () => {
    expect(matching_preset(DEFAULT_GALAXY_SETTINGS)).toBe("classic");
    expect(STAR_COUNTS).toContain(DEFAULT_GALAXY_SETTINGS.stars);
  });
});

describe("matching_preset", () => {
  it("should find no preset for a custom combination", () => {
    expect(matching_preset({ ...preset("merger"), bulge: false })).toBeNull();
    expect(matching_preset({ ...preset("classic"), stars: 500 })).toBeNull();
    expect(matching_preset({ ...preset("halo"), spins: [1, -1] })).toBeNull();
    expect(matching_preset({ ...preset("merger"), pericenter_kpc: 20 })).toBeNull();
  });

  it("should ignore settings that have no effect", () => {
    // friction needs halos, and the pericenter only matters for a custom encounter
    expect(matching_preset({ ...preset("classic"), friction: true })).toBe("classic");
    expect(matching_preset({ ...preset("halo"), pericenter_kpc: 30, eccentricity: 2 })).toBe("halo");
  });
});

describe("galaxy_options", () => {
  it("should leave out everything that is switched off", () => {
    expect(galaxy_options(DEFAULT_GALAXY_SETTINGS)).toEqual({
      halo: null,
      bulge_radius: 0,
      friction: false,
      spins: [1, 1],
      stars: 3000,
      encounter: undefined,
    });
  });

  it("should only use friction together with halos", () => {
    expect(galaxy_options({ ...DEFAULT_GALAXY_SETTINGS, friction: true }).friction).toBe(false);
    expect(galaxy_options({ ...DEFAULT_GALAXY_SETTINGS, halo: true, friction: true }).friction).toBe(true);
  });

  it("should convert a custom encounter from kpc to meters", () => {
    const options = galaxy_options({ ...DEFAULT_GALAXY_SETTINGS, custom_encounter: true, pericenter_kpc: 20, eccentricity: 1.4 });
    expect(options.encounter).toEqual({ pericenter: 20 * GALAXY_UNITS.meters_per_length_unit, eccentricity: 1.4 });
  });

  it("should pass on the spins and the number of stars", () => {
    const options = galaxy_options({ ...DEFAULT_GALAXY_SETTINGS, spins: [-1, 1], stars: 1000 });
    expect(options.spins).toEqual([-1, 1]);
    expect(options.stars).toBe(1000);
  });
});

describe("normalize_galaxy_settings", () => {
  it("should use the defaults for anything that is not an object", () => {
    for (const bad of [null, undefined, 5, "text", [], true]) expect(normalize_galaxy_settings(bad)).toEqual(DEFAULT_GALAXY_SETTINGS);
  });

  it("should keep valid settings", () => {
    for (const p of GALAXY_PRESETS) expect(normalize_galaxy_settings(JSON.parse(JSON.stringify(p.settings)))).toEqual(p.settings);
    const custom = { ...preset("merger"), pericenter_kpc: 22, eccentricity: 1.3, stars: 1000, spins: [-1, 1] };
    expect(normalize_galaxy_settings(custom)).toEqual(custom);
  });

  it("should replace invalid parts one by one, and keep the rest", () => {
    const saved = {
      halo: "yes",
      bulge: true,
      friction: 1,
      spins: [2, -1],
      custom_encounter: true,
      pericenter_kpc: 500,
      eccentricity: NaN,
      stars: 12.5,
    };
    expect(normalize_galaxy_settings(saved)).toEqual({
      halo: false,
      bulge: true,
      friction: false,
      spins: [1, -1],
      custom_encounter: true,
      pericenter_kpc: DEFAULT_GALAXY_SETTINGS.pericenter_kpc,
      eccentricity: DEFAULT_GALAXY_SETTINGS.eccentricity,
      stars: 3000,
    });
  });

  it("should reject numbers outside the supported ranges and non-array spins", () => {
    expect(normalize_galaxy_settings({ stars: -5 }).stars).toBe(3000);
    expect(normalize_galaxy_settings({ stars: 100000 }).stars).toBe(3000);
    expect(normalize_galaxy_settings({ custom_encounter: true, pericenter_kpc: 0.1 }).pericenter_kpc).toBe(
      DEFAULT_GALAXY_SETTINGS.pericenter_kpc,
    );
    expect(normalize_galaxy_settings({ custom_encounter: true, eccentricity: 9 }).eccentricity).toBe(DEFAULT_GALAXY_SETTINGS.eccentricity);
    expect(normalize_galaxy_settings({ spins: "ab" }).spins).toEqual([1, 1]);
  });

  it("should store friction only together with halos", () => {
    expect(normalize_galaxy_settings({ halo: false, friction: true }).friction).toBe(false);
    expect(normalize_galaxy_settings({ halo: true, friction: true }).friction).toBe(true);
  });
});

describe("the ranges the panel offers", () => {
  it("should keep the pericenter inside the distance the galaxies start at, and include a parabolic encounter", () => {
    expect(PERICENTER_RANGE.min).toBeGreaterThan(0);
    expect(PERICENTER_RANGE.max).toBeLessThan(60);
    expect(ECCENTRICITY_RANGE.min).toBeLessThan(1);
    expect(ECCENTRICITY_RANGE.max).toBeGreaterThan(1);
    // both the preset encounter and the default settings lie inside them
    for (const { settings } of GALAXY_PRESETS) {
      expect(settings.pericenter_kpc).toBeGreaterThanOrEqual(PERICENTER_RANGE.min);
      expect(settings.pericenter_kpc).toBeLessThanOrEqual(PERICENTER_RANGE.max);
      expect(settings.eccentricity).toBeGreaterThanOrEqual(ECCENTRICITY_RANGE.min);
      expect(settings.eccentricity).toBeLessThanOrEqual(ECCENTRICITY_RANGE.max);
    }
  });

  it("should be steps that land on the values the sliders can show", () => {
    expect((PERICENTER_RANGE.max - PERICENTER_RANGE.min) % PERICENTER_RANGE.step).toBe(0);
    expect(Math.round(((ECCENTRICITY_RANGE.max - ECCENTRICITY_RANGE.min) / ECCENTRICITY_RANGE.step) * 1e6) % 1e6).toBe(0);
    // the number of stars of the default settings can be chosen in the panel
    expect(STAR_COUNTS).toContain(DEFAULT_GALAXY_SETTINGS.stars);
  });
});

describe("encounter_problem", () => {
  const custom = (pericenter_kpc: number, eccentricity: number): GalaxySettings => ({
    ...DEFAULT_GALAXY_SETTINGS,
    halo: true,
    custom_encounter: true,
    pericenter_kpc,
    eccentricity,
  });
  const create = (settings: GalaxySettings) => () => createGalaxyCollision(seeded_random(1), { ...galaxy_options(settings), stars: 0 });

  it("should not complain about the hand-picked encounter, whatever the numbers say", () => {
    expect(encounter_problem({ ...DEFAULT_GALAXY_SETTINGS, pericenter_kpc: 99, eccentricity: 0.1 })).toBeNull();
  });

  it("should accept the encounters of the presets and parabolic or hyperbolic ones", () => {
    expect(encounter_problem(preset("merger"))).toBeNull();
    expect(encounter_problem(custom(30, 1))).toBeNull();
    expect(encounter_problem(custom(5, 2.5))).toBeNull();
  });

  it("should explain a bound orbit that does not reach the starting distance, and say which eccentricity works", () => {
    const message = encounter_problem(custom(13, 0.5))!;
    expect(message).toContain("only reaches out to 39 kpc");
    expect(message).toContain("60 kpc apart");
    // the eccentricity it suggests really works, and a clearly lower one is refused
    const needed = Number(message.match(/at least (\d+\.\d+)/)![1]);
    expect(needed).toBeCloseTo(0.69, 2);
    expect(encounter_problem(custom(13, needed))).toBeNull();
    expect(create(custom(13, needed))).not.toThrow();
    expect(encounter_problem(custom(13, needed - 0.05))).not.toBeNull();
  });

  it("should accept the smallest eccentricity that works with the halos, which is higher than for a Kepler orbit", () => {
    // 0.65 would do for a point mass, but with halos the solver finds no starting speed
    expect(create(custom(13, 0.65))).toThrow();
    expect(encounter_problem(custom(13, 0.65))).not.toBeNull();
    expect(create(custom(13, 0.7))).not.toThrow();
    expect(encounter_problem(custom(13, 0.7))).toBeNull();
  });

  it("should refuse a pericenter beyond the starting distance", () => {
    expect(encounter_problem(custom(60, 1))).toContain("smaller than the 60 kpc");
    expect(encounter_problem(custom(75, 1))).toContain("smaller than the 60 kpc");
  });

  it("should only accept combinations for which a scene without friction can be created", () => {
    // a coarse sample of everything the panel offers; the whole grid takes about 20 s
    for (const pericenter of [2, 13, 30, 50]) {
      for (const eccentricity of [0.5, 0.7, 0.9, 1, 1.5, 2.5]) {
        const settings = { ...custom(pericenter, eccentricity), friction: false };
        if (encounter_problem(settings) === null) expect(create(settings), `${pericenter} kpc, e=${eccentricity}`).not.toThrow();
      }
    }
  });

  it("should leave to the scene a few combinations with friction, whose first pass is either a plunge or a miss", () => {
    // with friction nothing lies between a merger on the way in and a wide first pass, so no sideways speed fits
    for (const [pericenter, eccentricity] of [
      [10, 0.75],
      [10, 0.8],
      [6, 0.85],
    ]) {
      const settings = { ...custom(pericenter, eccentricity), bulge: true, friction: true };
      expect(encounter_problem(settings)).toBeNull();
      expect(create(settings)).toThrow("no sideways speed gives this pericenter");
    }
  });
});
