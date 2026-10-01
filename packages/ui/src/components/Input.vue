<script setup lang="ts">
import { useField } from '../field'

defineOptions({ inheritAttrs: false })
const model = defineModel<string | number>()
const field = useField()
</script>

<template>
  <input
    v-bind="$attrs"
    :id="($attrs.id as string | undefined) ?? field?.id"
    v-model="model"
    :aria-describedby="field?.describedBy.value"
    :aria-invalid="field?.invalid.value || undefined"
    class="input"
  />
</template>

<style scoped>
.input {
  width: 100%;
  height: 38px;
  padding: 0 var(--s-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.input::placeholder {
  color: var(--muted);
}

.input:hover {
  border-color: color-mix(in oklch, var(--line-strong), var(--ink) 20%);
}

.input:focus-visible {
  border-color: var(--cobalt);
}

.input[aria-invalid='true'] {
  border-color: var(--danger);
}

.input:disabled,
.input[readonly] {
  opacity: 0.45;
  pointer-events: none;
}
</style>
