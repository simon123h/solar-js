<script setup lang="ts">
import {
  N_BODY_COUNTS,
  N_BODY_VELOCITY_OPTIONS,
  N_BODY_VELOCITY_SCALE_RANGE,
  NBodySettings,
  NBodyVelocityArrangement,
} from "./n-body-settings";

const props = defineProps<{
  modelValue: NBodySettings;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: NBodySettings): void;
}>();

function update<K extends keyof NBodySettings>(key: K, value: NBodySettings[K]) {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value,
  });
}
</script>

<template>
  <div class="hud-panel">
    <h2>N-Body Problem</h2>
    <label class="row">
      <span>Number of bodies</span>
      <select
        :value="modelValue.bodies"
        @change="update('bodies', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="count in N_BODY_COUNTS" :key="count" :value="count">
          {{ count }}
        </option>
      </select>
    </label>

    <label class="row">
      <span>Initial velocity</span>
      <select
        :value="modelValue.velocity_arrangement"
        @change="update('velocity_arrangement', ($event.target as HTMLSelectElement).value as NBodyVelocityArrangement)"
      >
        <option v-for="opt in N_BODY_VELOCITY_OPTIONS" :key="opt.id" :value="opt.id">
          {{ opt.label }}
        </option>
      </select>
    </label>

    <label class="row">
      <span>Velocity scale</span>
      <span class="range-wrap">
        <input
          type="range"
          :min="N_BODY_VELOCITY_SCALE_RANGE.min"
          :max="N_BODY_VELOCITY_SCALE_RANGE.max"
          :step="N_BODY_VELOCITY_SCALE_RANGE.step"
          :disabled="modelValue.velocity_arrangement === 'stationary'"
          :value="modelValue.velocity_scale"
          @change="update('velocity_scale', Number(($event.target as HTMLInputElement).value))"
        />
        <output>{{ modelValue.velocity_scale.toFixed(1) }}x</output>
      </span>
    </label>

    <fieldset>
      <legend>Mass</legend>
      <label>
        <input
          type="checkbox"
          :checked="modelValue.varied_masses"
          @change="update('varied_masses', ($event.target as HTMLInputElement).checked)"
        />
        Varied masses
      </label>
    </fieldset>
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

input[type="checkbox"] {
  accent-color: #38bdf8;
  margin-right: 6px;
}
</style>
