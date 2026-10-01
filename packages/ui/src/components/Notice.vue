<script setup lang="ts">
const props = withDefaults(
  defineProps<{ tone?: 'neutral' | 'amber' | 'danger' | 'success'; title?: string }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <div class="notice" :data-tone="props.tone" :role="props.tone === 'danger' ? 'alert' : 'status'">
    <p v-if="props.title" class="title">{{ props.title }}</p>
    <div class="body"><slot /></div>
  </div>
</template>

<style scoped>
.notice {
  display: grid;
  gap: var(--s-1);
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface-2);
  animation: notice-in var(--dur) var(--ease-out);
}

.notice[data-tone='amber'] {
  border-color: color-mix(in oklch, var(--amber) 35%, transparent);
  background: var(--amber-tint);
}

.notice[data-tone='danger'] {
  border-color: color-mix(in oklch, var(--danger) 35%, transparent);
  background: var(--danger-tint);
}

.notice[data-tone='success'] {
  border-color: color-mix(in oklch, var(--success) 35%, transparent);
  background: var(--success-tint);
}

.title {
  margin: 0;
  font-weight: 600;
}

.notice[data-tone='danger'] .title {
  color: var(--danger);
}

.notice[data-tone='amber'] .title {
  color: var(--amber-ink);
}

.body {
  color: var(--ink);
}

.body :deep(p) {
  margin: 0;
}

@keyframes notice-in {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
}
</style>
