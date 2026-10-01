<script setup lang="ts" generic="T extends string">
import { Check, ChevronDown } from 'lucide-vue-next'
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { computed } from 'vue'
import { useField } from '../field'

const model = defineModel<T>()
const props = defineProps<{
  options: readonly { value: T; label: string; description?: string }[]
  placeholder?: string
  disabled?: boolean
  label?: string
}>()
const field = useField()
const selected = computed(() => props.options.find((o) => o.value === model.value))
</script>

<template>
  <SelectRoot v-model="model" :disabled="props.disabled">
    <SelectTrigger
      :id="field?.id"
      :aria-label="props.label"
      :aria-describedby="field?.describedBy.value"
      :aria-invalid="field?.invalid.value || undefined"
      class="trigger"
    >
      <!-- Reka learns item labels only once the list mounts; name the choice ourselves so SSR shows it. -->
      <SelectValue :placeholder="props.placeholder">{{ selected?.label }}</SelectValue>
      <SelectIcon as-child>
        <ChevronDown class="chevron" :size="16" aria-hidden="true" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent position="popper" :side-offset="4" class="content">
        <SelectViewport class="viewport">
          <SelectItem v-for="o in props.options" :key="o.value" :value="o.value" class="item">
            <span class="text">
              <SelectItemText>{{ o.label }}</SelectItemText>
              <span v-if="o.description" class="description">{{ o.description }}</span>
            </span>
            <SelectItemIndicator class="indicator">
              <Check :size="16" aria-hidden="true" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
.trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
  width: 100%;
  height: 38px;
  padding: 0 var(--s-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}

.trigger:hover {
  border-color: color-mix(in oklch, var(--line-strong), var(--ink) 20%);
}

.trigger[data-state='open'] {
  border-color: var(--cobalt);
}

.trigger[data-placeholder] {
  color: var(--muted);
}

.trigger[data-disabled] {
  opacity: 0.45;
  pointer-events: none;
}

.chevron {
  flex: none;
  color: var(--muted);
  transition: transform var(--dur-fast) var(--ease-out);
}

.trigger[data-state='open'] .chevron {
  transform: rotate(180deg);
}

.content {
  z-index: 50;
  min-width: var(--reka-select-trigger-width);
  max-height: var(--reka-select-content-available-height);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  transform-origin: var(--reka-select-content-transform-origin);
}

.content[data-state='open'] {
  animation: pop-in var(--dur) var(--ease-out);
}

.content[data-state='closed'] {
  animation: pop-out var(--dur-fast) var(--ease-in-out);
}

.viewport {
  padding: var(--s-1);
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-sm);
  outline: none;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.item[data-highlighted] {
  background: var(--hover);
}

.item[data-state='checked'] {
  color: var(--cobalt);
}

.item[data-disabled] {
  opacity: 0.45;
  pointer-events: none;
}

.text {
  display: grid;
}

.description {
  color: var(--muted);
  font-size: var(--t-meta);
  line-height: var(--t-meta-lh);
}

.indicator {
  display: inline-flex;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}

@keyframes pop-out {
  to {
    opacity: 0;
    transform: scale(0.98);
  }
}
</style>
