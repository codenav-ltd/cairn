<script setup lang="ts">
import { useField } from '../field'

defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
const field = useField()
</script>

<template>
  <textarea
    v-bind="$attrs"
    :id="($attrs.id as string | undefined) ?? field?.id"
    v-model="model"
    :aria-describedby="field?.describedBy.value"
    :aria-invalid="field?.invalid.value || undefined"
    class="textarea"
  />
</template>

<style scoped>
.textarea {
  width: 100%;
  min-height: 88px;
  padding: var(--s-2) var(--s-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  resize: vertical;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.textarea:hover {
  border-color: color-mix(in oklch, var(--line-strong), var(--ink) 20%);
}

.textarea:focus-visible {
  border-color: var(--cobalt);
}

.textarea[aria-invalid='true'] {
  border-color: var(--danger);
}

.textarea:disabled {
  opacity: 0.45;
  pointer-events: none;
}
</style>
