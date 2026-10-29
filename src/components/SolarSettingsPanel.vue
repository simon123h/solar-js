<script setup lang="ts">
import { SOLAR_ASTEROID_COUNTS, SolarSystemSettings } from "../solar-settings";

const props = defineProps<{
  modelValue: SolarSystemSettings;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: SolarSystemSettings): void;
}>();

function update<K extends keyof SolarSystemSettings>(key: K, value: SolarSystemSettings[K]) {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value,
  });
}
</script>

<template>
  <div class="hud-panel">
    <h2>Solar System</h2>
    <label class="row">
      <span>Asteroids</span>
      <select
        :value="modelValue.asteroids"
        @change="update('asteroids', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="count in SOLAR_ASTEROID_COUNTS" :key="count" :value="count">
          {{ count === 0 ? "None" : count }}
        </option>
      </select>
    </label>

    <fieldset>
      <legend>Planets</legend>
      <label>
        <input
          type="checkbox"
          :checked="modelValue.include_pluto"
          @change="update('include_pluto', ($event.target as HTMLInputElement).checked)"
        />
        Include Pluto
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
}

select:focus {
  border-color: #38bdf8;
}

select option {
  background: #1e293b;
  color: #f1f5f9;
}

input[type="checkbox"] {
  accent-color: #38bdf8;
  margin-right: 6px;
}
</style>
