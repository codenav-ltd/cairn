<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
const { t } = useI18n()
const visible = ref(false)
</script>

<template>
  <div class="relative">
    <UiInput
      v-model="model"
      v-bind="$attrs"
      :type="visible ? 'text' : 'password'"
      class="pr-10"
      spellcheck="false"
      autocapitalize="off"
    />
    <button
      type="button"
      class="toggle"
      :aria-label="visible ? t('common.hidePassword') : t('common.showPassword')"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" :size="16" aria-hidden="true" />
      <Eye v-else :size="16" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.toggle {
  position: absolute;
  top: 50%;
  right: var(--s-1);
  display: inline-flex;
  padding: 6px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.toggle:hover {
  background: var(--hover);
  color: var(--ink);
}

.toggle:active {
  background: var(--press);
}
</style>
