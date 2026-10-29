<script setup lang="ts">
import {
  COSMIC_WEB_PARTICLE_COUNTS,
  COSMIC_WEB_ROUGHNESS_RANGE,
  COSMIC_WEB_AMPLITUDE_RANGE,
  COSMIC_WEB_EXPANSION_RANGE,
  CosmicWebSettings,
} from "./cosmic-web-settings";

const props = defineProps<{
  modelValue: CosmicWebSettings;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: CosmicWebSettings): void;
}>();

function update<K extends keyof CosmicWebSettings>(key: K, value: CosmicWebSettings[K]) {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value,
  });
}
</script>

<template>
  <div class="hud-panel">
    <h2>Cosmic Web (Structure Formation)</h2>
    <label class="row">
      <span>Particles</span>
      <select
        :value="modelValue.particles"
        @change="update('particles', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="count in COSMIC_WEB_PARTICLE_COUNTS" :key="count" :value="count">
          {{ count }}
        </option>
      </select>
    </label>

    <label class="row">
      <span>Roughness (wave modes)</span>
      <span class="range-wrap">
        <input
          type="range"
          :min="COSMIC_WEB_ROUGHNESS_RANGE.min"
          :max="COSMIC_WEB_ROUGHNESS_RANGE.max"
          :step="COSMIC_WEB_ROUGHNESS_RANGE.step"
          :value="modelValue.roughness"
          @change="update('roughness', Number(($event.target as HTMLInputElement).value))"
        />
        <output>{{ modelValue.roughness }}</output>
      </span>
    </label>

    <label class="row">
      <span>Perturbation amplitude</span>
      <span class="range-wrap">
        <input
          type="range"
          :min="COSMIC_WEB_AMPLITUDE_RANGE.min"
          :max="COSMIC_WEB_AMPLITUDE_RANGE.max"
          :step="COSMIC_WEB_AMPLITUDE_RANGE.step"
          :value="modelValue.perturbation_amplitude"
          @change="update('perturbation_amplitude', Number(($event.target as HTMLInputElement).value))"
        />
        <output>{{ modelValue.perturbation_amplitude.toFixed(2) }}</output>
      </span>
    </label>

    <label class="row">
      <span>Cosmic expansion / collapse</span>
      <span class="range-wrap">
        <input
          type="range"
          :min="COSMIC_WEB_EXPANSION_RANGE.min"
          :max="COSMIC_WEB_EXPANSION_RANGE.max"
          :step="COSMIC_WEB_EXPANSION_RANGE.step"
          :value="modelValue.expansion"
          @change="update('expansion', Number(($event.target as HTMLInputElement).value))"
        />
        <output>{{ modelValue.expansion.toFixed(1) }}</output>
      </span>
    </label>

    <p class="hud-info">
      Simulates gravitational Jeans instability from multi-scale Zel'dovich density perturbations,
      forming dark matter sheets, filaments, and voids over gigayears.
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

label {
  display: block;
  margin: 7px 0;
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
  min-width: 3.5em;
  text-align: right;
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
  color: #38bdf8;
}

.hud-info {
  margin: 10px 0 0 0;
  padding: 8px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  color: #93c5fd;
  font-size: 0.82em;
  line-height: 1.4;
}
</style>
