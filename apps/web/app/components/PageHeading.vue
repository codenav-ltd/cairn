<script setup lang="ts">
const props = defineProps<{ spec: string; title: string; lead?: string }>()
</script>

<template>
  <header class="mb-8 grid gap-3">
    <p class="font-mono text-meta text-muted">{{ props.spec }}</p>
    <h1 class="title font-display text-h2">{{ props.title }}</h1>
    <p v-if="props.lead" class="text-muted">{{ props.lead }}</p>
  </header>
</template>

<style scoped>
.title {
  margin: 0;
  font-weight: 650;
  font-stretch: 90%;
  letter-spacing: -0.015em;
}
</style>
