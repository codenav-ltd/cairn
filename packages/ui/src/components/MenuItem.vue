<script setup lang="ts">
import { DropdownMenuItem } from 'reka-ui'

const props = defineProps<{ asChild?: boolean; danger?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ select: [event: Event] }>()
</script>

<template>
  <DropdownMenuItem
    :as-child="props.asChild"
    :disabled="props.disabled"
    :data-danger="props.danger || undefined"
    class="item"
    @select="emit('select', $event)"
  >
    <slot />
  </DropdownMenuItem>
</template>

<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  width: 100%;
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-sm);
  color: var(--ink);
  text-decoration: none;
  outline: none;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.item[data-highlighted] {
  background: var(--hover);
}

.item:active {
  background: var(--press);
}

.item[data-danger] {
  color: var(--danger);
}

.item[data-disabled] {
  opacity: 0.45;
  pointer-events: none;
}
</style>
