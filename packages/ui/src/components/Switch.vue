<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { useId } from 'vue'

const model = defineModel<boolean>({ default: false })
const props = defineProps<{ label: string; description?: string; disabled?: boolean }>()
const id = useId()
</script>

<template>
  <div class="row" :data-disabled="props.disabled || undefined">
    <div class="text">
      <label :for="id" class="label">{{ props.label }}</label>
      <p v-if="props.description" :id="`${id}-description`" class="description">
        {{ props.description }}
      </p>
    </div>
    <SwitchRoot
      :id="id"
      v-model="model"
      :disabled="props.disabled"
      :aria-describedby="props.description ? `${id}-description` : undefined"
      class="switch"
    >
      <SwitchThumb class="thumb" />
    </SwitchRoot>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-5);
}

.row[data-disabled] {
  opacity: 0.45;
}

.text {
  display: grid;
  gap: var(--s-1);
}

.label {
  font-weight: 600;
}

.description {
  margin: 0;
  color: var(--muted);
  font-size: var(--t-meta);
  line-height: var(--t-meta-lh);
}

.switch {
  position: relative;
  flex: none;
  width: 36px;
  height: 20px;
  margin-top: 1px;
  padding: 0;
  border: 0;
  border-radius: var(--r-full);
  background: var(--line-strong);
  cursor: pointer;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.switch:hover {
  background: color-mix(in oklch, var(--line-strong), var(--ink) 15%);
}

.switch:active {
  transform: scale(0.96);
}

.switch[data-state='checked'] {
  background: var(--cobalt);
}

.switch[data-disabled] {
  pointer-events: none;
}

.thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: var(--r-full);
  background: var(--surface);
  box-shadow: 0 1px 2px var(--shadow-near);
  transform: translateX(2px);
  transition: transform var(--dur) var(--ease-out);
}

.thumb[data-state='checked'] {
  transform: translateX(18px);
}
</style>
