<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'

const props = withDefaults(defineProps<{ align?: 'start' | 'center' | 'end' }>(), { align: 'end' })
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent :align="props.align" :side-offset="6" class="menu">
        <slot />
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style scoped>
.menu {
  z-index: 50;
  min-width: 200px;
  padding: var(--s-1);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  transform-origin: var(--reka-dropdown-menu-content-transform-origin);
}

.menu[data-state='open'] {
  animation: menu-in var(--dur) var(--ease-out);
}

.menu[data-state='closed'] {
  animation: menu-out var(--dur-fast) var(--ease-in-out);
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}

@keyframes menu-out {
  to {
    opacity: 0;
    transform: scale(0.98);
  }
}
</style>
