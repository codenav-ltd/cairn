<script setup lang="ts">
import { computed, provide, useId } from 'vue'
import { fieldKey } from '../field'

const props = defineProps<{
  label: string
  hint?: string
  error?: string | null
  optional?: string
}>()

const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`

provide(fieldKey, {
  id,
  describedBy: computed(
    () =>
      [props.error ? errorId : null, props.hint ? hintId : null].filter(Boolean).join(' ') ||
      undefined,
  ),
  invalid: computed(() => Boolean(props.error)),
})
</script>

<template>
  <div class="field">
    <label :for="id" class="label">
      {{ props.label }}
      <span v-if="props.optional" class="optional">{{ props.optional }}</span>
    </label>
    <slot />
    <p v-if="props.error" :id="errorId" class="error" role="alert">{{ props.error }}</p>
    <p v-else-if="props.hint" :id="hintId" class="hint">{{ props.hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: grid;
  gap: var(--s-2);
}

.label {
  font-weight: 600;
}

.optional {
  margin-left: var(--s-1);
  color: var(--muted);
  font-weight: 400;
}

.hint,
.error {
  margin: 0;
  font-size: var(--t-meta);
  line-height: var(--t-meta-lh);
  color: var(--muted);
}

.error {
  color: var(--danger);
}
</style>
