<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-3 font-mono text-micro text-muted" role="separator">
    <span class="h-px flex-1 bg-line" />
    {{ t('common.or') }}
    <span class="h-px flex-1 bg-line" />
  </div>
</template>
