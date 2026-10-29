<script setup lang="ts">
defineProps<{
  paused: boolean;
  speed: number;
  universe: string;
  settingsOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle-pause"): void;
  (e: "reset"): void;
  (e: "update:speed", speed: number): void;
  (e: "update:universe", universe: string): void;
  (e: "toggle-settings"): void;
}>();
</script>

<template>
  <div class="controls-bar">
    <div class="control-group">
      <button
        class="btn btn-pause"
        type="button"
        title="Pause / Resume simulation"
        @click="emit('toggle-pause')"
      >
        <span>{{ paused ? "Resume" : "Pause" }}</span>
      </button>
      <button
        class="btn"
        type="button"
        title="Reset scenario"
        @click="emit('reset')"
      >
        Reset
      </button>
      <div class="select-wrapper">
        <select
          class="speed-select"
          title="Simulation speed"
          :value="speed"
          @change="emit('update:speed', Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="0.25">0.25x</option>
          <option :value="0.5">0.5x</option>
          <option :value="1">1x</option>
          <option :value="2">2x</option>
          <option :value="4">4x</option>
        </select>
      </div>
    </div>

    <div class="control-group">
      <div class="select-wrapper">
        <select
          class="universe-select"
          title="Select scenario"
          :value="universe"
          @change="emit('update:universe', ($event.target as HTMLSelectElement).value)"
        >
          <option value="solar-system">Solar System</option>
          <option value="galaxy-collision">Galaxy Collision</option>
          <option value="n-body-universe">N-Body Problem</option>
        </select>
      </div>
      <button
        class="btn"
        :class="{ active: settingsOpen }"
        type="button"
        @click="emit('toggle-settings')"
      >
        Settings
      </button>
    </div>
  </div>
</template>

<style scoped>
.controls-bar {
  position: fixed;
  bottom: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
}

.control-group {
  display: flex;
  align-items: center;
  background-color: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 3px 4px;
  gap: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.btn {
  background: transparent;
  color: #e2e8f0;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:hover {
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.btn:active,
.btn.active {
  background-color: rgba(56, 189, 248, 0.25);
  color: #38bdf8;
}

.btn-pause {
  width: 76px;
  box-sizing: border-box;
}

.select-wrapper {
  display: inline-flex;
  align-items: center;
}

select {
  background: transparent;
  color: #e2e8f0;
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s ease;
}

select:hover {
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

select option {
  background-color: #1e293b;
  color: #e2e8f0;
}

.speed-select {
  width: 62px;
  box-sizing: border-box;
  text-align: center;
}

.universe-select {
  min-width: 135px;
}
</style>
