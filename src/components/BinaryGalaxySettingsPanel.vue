<script setup lang="ts">
import {
  BINARY_GALAXY_MASS_RATIO_RANGE,
  BINARY_GALAXY_SEPARATION_RANGE,
  BINARY_GALAXY_STAR_COUNTS,
  BinaryGalaxySettings,
} from "../binary-galaxy-settings";

const props = defineProps<{
  modelValue: BinaryGalaxySettings;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: BinaryGalaxySettings): void;
}>();

function update<K extends keyof BinaryGalaxySettings>(key: K, value: BinaryGalaxySettings[K]) {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value,
  });
}
</script>

<template>
  <div class="hud-panel">
    <h2>Binary Black Hole Galaxy</h2>

    <fieldset>
      <legend>Central Binary</legend>
      <label class="row">
        <span>Separation</span>
        <span class="range-wrap">
          <input
            type="range"
            :min="BINARY_GALAXY_SEPARATION_RANGE.min"
            :max="BINARY_GALAXY_SEPARATION_RANGE.max"
            :step="BINARY_GALAXY_SEPARATION_RANGE.step"
            :value="modelValue.separation_kpc"
            @change="update('separation_kpc', Number(($event.target as HTMLInputElement).value))"
          />
          <output>{{ modelValue.separation_kpc.toFixed(1) }} kpc</output>
        </span>
      </label>

      <label class="row">
        <span>Mass ratio (q)</span>
        <span class="range-wrap">
          <input
            type="range"
            :min="BINARY_GALAXY_MASS_RATIO_RANGE.min"
            :max="BINARY_GALAXY_MASS_RATIO_RANGE.max"
            :step="BINARY_GALAXY_MASS_RATIO_RANGE.step"
            :value="modelValue.mass_ratio"
            @change="update('mass_ratio', Number(($event.target as HTMLInputElement).value))"
          />
          <output>{{ modelValue.mass_ratio.toFixed(1) }}</output>
        </span>
      </label>
    </fieldset>

    <fieldset>
      <legend>Galactic Disk</legend>
      <label class="row">
        <span>Stars</span>
        <select
          :value="modelValue.stars"
          @change="update('stars', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="count in BINARY_GALAXY_STAR_COUNTS" :key="count" :value="count">
            {{ count }}
          </option>
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          :checked="modelValue.halo"
          @change="update('halo', ($event.target as HTMLInputElement).checked)"
        />
        Dark matter halo
      </label>
    </fieldset>

    <p class="hud-info">
      Simulates a galactic disk orbiting a supermassive binary black hole pair at its core.
      Observe gravitational perturbations and stellar ejections near the pericenter.
    </p>
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
  margin: 6px 0;
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
  max-width: 170px;
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

.hud-info {
  margin: 10px 0 0 0;
  padding: 8px;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 6px;
  color: #d8b4fe;
  font-size: 0.82em;
  line-height: 1.4;
}
</style>
