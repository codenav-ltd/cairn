<script setup lang="ts">
const props = withDefaults(
  defineProps<{ tone?: 'neutral' | 'cobalt' | 'amber' | 'danger' | 'success' }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span class="badge" :data-tone="props.tone"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  height: 20px;
  padding: 0 6px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
  color: var(--muted);
  font-family: var(--face-mono);
  font-size: var(--t-micro);
  line-height: var(--t-micro-lh);
  white-space: nowrap;
}

.badge[data-tone='cobalt'] {
  border-color: var(--cobalt-border);
  background: var(--cobalt-tint);
  color: var(--cobalt);
}

.badge[data-tone='amber'] {
  border-color: color-mix(in oklch, var(--amber) 35%, transparent);
  background: var(--amber-tint);
  color: var(--amber-ink);
}

.badge[data-tone='danger'] {
  border-color: color-mix(in oklch, var(--danger) 35%, transparent);
  background: var(--danger-tint);
  color: var(--danger);
}

.badge[data-tone='success'] {
  border-color: color-mix(in oklch, var(--success) 35%, transparent);
  background: var(--success-tint);
  color: var(--success);
}
</style>
