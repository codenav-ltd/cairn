<script setup lang="ts">
import { X } from 'lucide-vue-next'
import {
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from 'reka-ui'
import { useToast } from '../toast'

const props = defineProps<{ closeLabel: string; regionLabel: string }>()
const { toasts, dismiss } = useToast()
</script>

<template>
  <ToastProvider :duration="5000" :label="props.regionLabel">
    <ToastRoot
      v-for="t in toasts"
      :key="t.id"
      :data-tone="t.tone"
      :type="t.tone === 'danger' ? 'foreground' : 'background'"
      class="toast"
      @update:open="(open: boolean) => !open && dismiss(t.id)"
    >
      <div class="text">
        <ToastTitle class="title">{{ t.title }}</ToastTitle>
        <ToastDescription v-if="t.description" class="description">{{
          t.description
        }}</ToastDescription>
      </div>
      <ToastClose class="close" :aria-label="props.closeLabel">
        <X :size="16" aria-hidden="true" />
      </ToastClose>
    </ToastRoot>
    <ToastViewport class="viewport" />
  </ToastProvider>
</template>

<style scoped>
.viewport {
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  width: min(380px, 100vw);
  margin: 0;
  padding: var(--s-4);
  list-style: none;
  outline: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--line);
  border-left: 3px solid var(--line-strong);
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
}

.toast[data-tone='success'] {
  border-left-color: var(--success);
}

.toast[data-tone='danger'] {
  border-left-color: var(--danger);
}

.toast[data-state='open'] {
  animation: toast-in var(--dur) var(--ease-out);
}

.toast[data-state='closed'] {
  animation: toast-out var(--dur-fast) var(--ease-in-out);
}

.toast[data-swipe='move'] {
  transform: translateX(var(--reka-toast-swipe-move-x));
}

.toast[data-swipe='end'] {
  animation: toast-out var(--dur-fast) var(--ease-in-out);
}

.text {
  display: grid;
  flex: 1;
  gap: 2px;
}

.title {
  font-weight: 600;
}

.description {
  color: var(--muted);
  font-size: var(--t-meta);
  line-height: var(--t-meta-lh);
}

.close {
  display: inline-flex;
  padding: 2px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.close:hover {
  background: var(--hover);
  color: var(--ink);
}

.close:active {
  background: var(--press);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes toast-out {
  to {
    opacity: 0;
    transform: translateX(16px);
  }
}
</style>
