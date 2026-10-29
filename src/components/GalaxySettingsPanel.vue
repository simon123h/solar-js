<script setup lang="ts">
import { computed } from "vue";
import {
  ECCENTRICITY_RANGE,
  GALAXY_PRESETS,
  GalaxySettings,
  PERICENTER_RANGE,
  STAR_COUNTS,
  matching_preset,
} from "../galaxy-settings";

const props = defineProps<{
  modelValue: GalaxySettings;
  message?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: GalaxySettings): void;
}>();

const activePreset = computed({
  get: () => matching_preset(props.modelValue) ?? "custom",
  set: (val: string) => {
    const found = GALAXY_PRESETS.find((p) => p.id === val);
    if (found) {
      emit("update:modelValue", { ...found.settings });
    }
  },
});

function update<K extends keyof GalaxySettings>(key: K, value: GalaxySettings[K]) {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value,
  });
}

function updateSpin(index: 0 | 1, value: number) {
  const nextSpins: [number, number] = [...props.modelValue.spins];
  nextSpins[index] = value;
  emit("update:modelValue", {
    ...props.modelValue,
    spins: nextSpins,
  });
}
</script>

<template>
  <div class="hud-panel">
    <h2>Galaxy Collision</h2>
    <label class="row">
      <span>Preset</span>
      <select v-model="activePreset">
        <option v-for="p in GALAXY_PRESETS" :key="p.id" :value="p.id">{{ p.label }}</option>
        <option value="custom">Custom</option>
      </select>
    </label>

    <fieldset>
      <legend>Physics</legend>
      <label>
        <input
          type="checkbox"
          :checked="modelValue.halo"
          @change="update('halo', ($event.target as HTMLInputElement).checked)"
        />
        Dark matter halos
      </label>
      <label>
        <input
          type="checkbox"
          :checked="modelValue.bulge"
          @change="update('bulge', ($event.target as HTMLInputElement).checked)"
        />
        Extended bulges
      </label>
      <label>
        <input
          type="checkbox"
          :checked="modelValue.friction"
          :disabled="!modelValue.halo"
          @change="update('friction', ($event.target as HTMLInputElement).checked)"
        />
        Dynamical friction (merger)
      </label>
    </fieldset>

    <fieldset>
      <legend>Rotation</legend>
      <label class="row">
        <span>Milky Way</span>
        <select :value="modelValue.spins[0]" @change="updateSpin(0, Number(($event.target as HTMLSelectElement).value))">
          <option :value="1">Prograde</option>
          <option :value="-1">Retrograde</option>
        </select>
      </label>
      <label class="row">
        <span>Andromeda</span>
        <select :value="modelValue.spins[1]" @change="updateSpin(1, Number(($event.target as HTMLSelectElement).value))">
          <option :value="1">Prograde</option>
          <option :value="-1">Retrograde</option>
        </select>
      </label>
    </fieldset>

    <fieldset>
      <legend>Encounter</legend>
      <label class="row">
        <span>Orbit</span>
        <select
          :value="modelValue.custom_encounter ? 'custom' : 'fast'"
          @change="update('custom_encounter', ($event.target as HTMLSelectElement).value === 'custom')"
        >
          <option value="fast">Fast pass</option>
          <option value="custom">Custom orbit</option>
        </select>
      </label>
      <label class="row">
        <span>Closest approach</span>
        <span class="range-wrap">
          <input
            type="range"
            :min="PERICENTER_RANGE.min"
            :max="PERICENTER_RANGE.max"
            :step="PERICENTER_RANGE.step"
            :disabled="!modelValue.custom_encounter"
            :value="modelValue.pericenter_kpc"
            @change="update('pericenter_kpc', Number(($event.target as HTMLInputElement).value))"
          />
          <output>{{ modelValue.pericenter_kpc }} kpc</output>
        </span>
      </label>
      <label class="row">
        <span>Eccentricity</span>
        <span class="range-wrap">
          <input
            type="range"
            :min="ECCENTRICITY_RANGE.min"
            :max="ECCENTRICITY_RANGE.max"
            :step="ECCENTRICITY_RANGE.step"
            :disabled="!modelValue.custom_encounter"
            :value="modelValue.eccentricity"
            @change="update('eccentricity', Number(($event.target as HTMLInputElement).value))"
          />
          <output>{{ modelValue.eccentricity.toFixed(2) }}</output>
        </span>
      </label>
    </fieldset>

    <label class="row">
      <span>Stars per galaxy</span>
      <select :value="modelValue.stars" @change="update('stars', Number(($event.target as HTMLSelectElement).value))">
        <option v-for="c in STAR_COUNTS" :key="c" :value="c">{{ c }}</option>
      </select>
    </label>

    <p v-if="message" class="hud-alert" role="alert">{{ message }}</p>
  </div>
</template>

<style scoped>
.hud-panel {
  position: fixed;
  top: 12px;
  right: 12px;
  width: 320px;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 12px 14px;
  background-color: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 0.88em;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  user-select: none;
}

h2 {
  margin: 0 0 10px 0;
  font-size: 1.05em;
  font-weight: 600;
  color: #f8fafc;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
}

fieldset {
  margin: 8px 0;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
}

legend {
  font-size: 0.85em;
  color: #94a3b8;
  padding: 0 4px;
}

label {
  display: block;
  margin: 5px 0;
  color: #cbd5e1;
  font-size: 0.95em;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

select {
  background: rgba(0, 0, 0, 0.35);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 0.92em;
  outline: none;
}

select:focus {
  border-color: #38bdf8;
}

select option {
  background: #1e293b;
  color: #f1f5f9;
}

.range-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

input[type="range"] {
  width: 90px;
  accent-color: #38bdf8;
}

output {
  display: inline-block;
  min-width: 4.5em;
  text-align: right;
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
  color: #38bdf8;
}

input[type="checkbox"] {
  accent-color: #38bdf8;
  margin-right: 6px;
}

.hud-alert {
  margin: 8px 0 0 0;
  padding: 6px 8px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 4px;
  color: #fca5a5;
  font-size: 0.85em;
  line-height: 1.35;
}
</style>
