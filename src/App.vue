<script setup lang="ts">
import { ref, computed } from "vue";
import StatsBox from "./components/StatsBox.vue";
import ControlsBar from "./components/ControlsBar.vue";
import GalaxySettingsPanel from "./components/GalaxySettingsPanel.vue";
import SolarSettingsPanel from "./components/SolarSettingsPanel.vue";
import NBodySettingsPanel from "./components/NBodySettingsPanel.vue";
import { GalaxySettings } from "./galaxy-settings";
import { SolarSystemSettings } from "./solar-settings";
import { NBodySettings } from "./n-body-settings";

const props = defineProps<{
  initialUniverse: string;
  initialSpeed: number;
  initialGalaxy: GalaxySettings;
  initialSolar: SolarSystemSettings;
  initialNBody: NBodySettings;
  initialStats: string;
}>();

const emit = defineEmits<{
  (e: "change-universe", universe: string): void;
  (e: "change-speed", speed: number): void;
  (e: "toggle-pause", paused: boolean): void;
  (e: "reset"): void;
  (e: "update-galaxy", settings: GalaxySettings): void;
  (e: "update-solar", settings: SolarSystemSettings): void;
  (e: "update-nbody", settings: NBodySettings): void;
}>();

const universe = ref(props.initialUniverse);
const speed = ref(props.initialSpeed);
const paused = ref(false);
const settingsOpen = ref(false);
const statsText = ref(props.initialStats);

const galaxySettings = ref<GalaxySettings>({ ...props.initialGalaxy });
const solarSettings = ref<SolarSystemSettings>({ ...props.initialSolar });
const nBodySettings = ref<NBodySettings>({ ...props.initialNBody });

const galaxyMessage = ref("");

function onTogglePause() {
  paused.value = !paused.value;
  emit("toggle-pause", paused.value);
}

function onReset() {
  emit("reset");
}

function onUpdateSpeed(newSpeed: number) {
  speed.value = newSpeed;
  emit("change-speed", newSpeed);
}

function onUpdateUniverse(newUniverse: string) {
  universe.value = newUniverse;
  emit("change-universe", newUniverse);
}

function onToggleSettings() {
  settingsOpen.value = !settingsOpen.value;
}

function onUpdateGalaxy(next: GalaxySettings) {
  galaxySettings.value = next;
  emit("update-galaxy", next);
}

function onUpdateSolar(next: SolarSystemSettings) {
  solarSettings.value = next;
  emit("update-solar", next);
}

function onUpdateNBody(next: NBodySettings) {
  nBodySettings.value = next;
  emit("update-nbody", next);
}

// Expose methods to main.ts for high-performance updates without triggering heavy renders
defineExpose({
  updateStats(text: string) {
    statsText.value = text;
  },
  setGalaxyMessage(msg: string) {
    galaxyMessage.value = msg;
  },
  setGalaxySettings(settings: GalaxySettings) {
    galaxySettings.value = settings;
  },
  getSettings() {
    return {
      universe: universe.value,
      speed: speed.value,
      galaxy: galaxySettings.value,
      solar: solarSettings.value,
      nbody: nBodySettings.value,
    };
  },
});
</script>

<template>
  <StatsBox :stats-text="statsText" />

  <ControlsBar
    :paused="paused"
    :speed="speed"
    :universe="universe"
    :settings-open="settingsOpen"
    @toggle-pause="onTogglePause"
    @reset="onReset"
    @update:speed="onUpdateSpeed"
    @update:universe="onUpdateUniverse"
    @toggle-settings="onToggleSettings"
  />

  <template v-if="settingsOpen">
    <GalaxySettingsPanel
      v-if="universe === 'galaxy-collision'"
      :model-value="galaxySettings"
      :message="galaxyMessage"
      @update:model-value="onUpdateGalaxy"
    />
    <SolarSettingsPanel
      v-else-if="universe === 'solar-system'"
      :model-value="solarSettings"
      @update:model-value="onUpdateSolar"
    />
    <NBodySettingsPanel
      v-else-if="universe === 'n-body-universe'"
      :model-value="nBodySettings"
      @update:model-value="onUpdateNBody"
    />
  </template>
</template>
