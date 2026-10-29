<script setup lang="ts">
defineProps<{
  statsText: string;
}>();
</script>

<template>
  <div class="stats-box" v-html="statsText"></div>
</template>

<style scoped>
.stats-box {
  position: fixed;
  top: 12px;
  left: 12px;
  width: 220px;
  box-sizing: border-box;
  background-color: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85em;
  line-height: 1.45;
  padding: 8px 12px;
  text-align: left;
  user-select: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
</style>
