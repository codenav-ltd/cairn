<script setup lang="ts">
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ title: string; description?: string; closeLabel: string }>()
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="overlay" />
      <DialogContent class="dialog">
        <header class="head">
          <DialogTitle class="title">{{ props.title }}</DialogTitle>
          <DialogClose class="close" :aria-label="props.closeLabel">
            <X :size="18" aria-hidden="true" />
          </DialogClose>
        </header>
        <DialogDescription v-if="props.description" class="description">
          {{ props.description }}
        </DialogDescription>
        <div class="body"><slot /></div>
        <footer v-if="$slots.footer" class="foot"><slot name="footer" /></footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: color-mix(in oklch, var(--bg) 60%, transparent);
  backdrop-filter: blur(2px);
}

.overlay[data-state='open'] {
  animation: fade-in var(--dur) var(--ease-out);
}

.overlay[data-state='closed'] {
  animation: fade-out var(--dur-fast) var(--ease-in-out);
}

.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 50;
  display: grid;
  gap: var(--s-4);
  width: min(480px, calc(100vw - 2 * var(--s-4)));
  max-height: calc(100dvh - 2 * var(--s-6));
  overflow: auto;
  padding: var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  transform: translate(-50%, -50%);
}

.dialog[data-state='open'] {
  animation: dialog-in var(--dur-slow) var(--ease-out);
}

.dialog[data-state='closed'] {
  animation: dialog-out var(--dur-fast) var(--ease-in-out);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
}

.title {
  margin: 0;
  font-family: var(--face-display);
  font-size: var(--t-h4);
  line-height: var(--t-h4-lh);
  font-weight: 650;
  font-stretch: 90%;
}

.close {
  display: inline-flex;
  padding: var(--s-1);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.close:hover {
  background: var(--hover);
  color: var(--ink);
}

.close:active {
  transform: scale(0.94);
  background: var(--press);
}

.description {
  margin: 0;
  color: var(--muted);
}

.body {
  display: grid;
  gap: var(--s-4);
}

.foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--s-2);
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes fade-out {
  to {
    opacity: 0;
  }
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 8px)) scale(0.98);
  }
}

@keyframes dialog-out {
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.98);
  }
}
</style>
