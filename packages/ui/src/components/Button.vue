<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui'
import Spinner from './Spinner.vue'

const props = withDefaults(
  defineProps<
    PrimitiveProps & {
      variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
      size?: 'md' | 'sm'
      loading?: boolean
      disabled?: boolean
      type?: 'button' | 'submit' | 'reset'
    }
  >(),
  { as: 'button', variant: 'secondary', size: 'md', type: 'button' },
)
</script>

<template>
  <Primitive
    :as="props.as"
    :as-child="props.asChild"
    :type="props.as === 'button' ? props.type : undefined"
    :disabled="props.as === 'button' ? props.disabled || props.loading : undefined"
    :aria-disabled="props.disabled || props.loading || undefined"
    :aria-busy="props.loading || undefined"
    :data-variant="props.variant"
    :data-size="props.size"
    :data-loading="props.loading || undefined"
    class="button"
  >
    <span class="label"><slot /></span>
    <Spinner v-if="props.loading" class="busy" />
  </Primitive>
</template>

<style scoped>
.button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
  height: 36px;
  padding: 0 var(--s-4);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.button[data-size='sm'] {
  height: 30px;
  padding: 0 var(--s-3);
  font-size: var(--t-meta);
}

.button:hover {
  background-color: color-mix(in oklch, var(--surface), var(--ink) 5%);
}

.button:active {
  transform: scale(0.98);
  background-color: color-mix(in oklch, var(--surface), var(--ink) 9%);
}

.button[data-variant='primary'] {
  border-color: var(--cobalt);
  background: var(--cobalt);
  color: var(--on-cobalt);
}

.button[data-variant='primary']:hover {
  background-color: color-mix(in oklch, var(--cobalt), var(--ink) 12%);
}

.button[data-variant='ghost'] {
  border-color: transparent;
  background: transparent;
}

.button[data-variant='ghost']:hover {
  background: var(--hover);
}

.button[data-variant='ghost']:active {
  background: var(--press);
}

.button[data-variant='danger'] {
  border-color: color-mix(in oklch, var(--danger) 40%, transparent);
  color: var(--danger);
}

.button[data-variant='danger']:hover {
  background: var(--danger-tint);
}

.button:disabled,
.button[aria-disabled='true'] {
  opacity: 0.45;
  pointer-events: none;
}

.button[data-loading] {
  opacity: 1;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
}

.button[data-loading] .label {
  visibility: hidden;
}

.busy {
  position: absolute;
  inset: 0;
  margin: auto;
}
</style>
