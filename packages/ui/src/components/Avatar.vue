<script setup lang="ts">
import { AvatarFallback, AvatarImage, AvatarRoot } from 'reka-ui'
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; src?: string | null; size?: number }>(), {
  size: 32,
})

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1 ? [parts[0]![0], parts.at(-1)![0]] : [...(parts[0] ?? '?')].slice(0, 2)
  return letters.join('').toUpperCase()
})
</script>

<template>
  <AvatarRoot class="avatar" :style="{ width: `${props.size}px`, height: `${props.size}px` }">
    <AvatarImage v-if="props.src" :src="props.src" :alt="props.name" class="image" />
    <AvatarFallback class="fallback" :style="{ fontSize: `${Math.round(props.size * 0.4)}px` }">
      {{ initials }}
    </AvatarFallback>
  </AvatarRoot>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--r-full);
  background: var(--surface-2);
  border: 1px solid var(--line);
  vertical-align: middle;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fallback {
  color: var(--muted);
  font-family: var(--face-mono);
  font-weight: 600;
  line-height: 1;
}
</style>
