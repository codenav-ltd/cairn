<script setup lang="ts">
definePageMeta({ layout: 'studio', middleware: 'studio' })

const allowed = useCan()
const localePath = useLocalePath()
await navigateTo(localePath(allowed('settings.manage') ? '/studio/settings' : '/studio/members'), {
  replace: true,
})
</script>

<template>
  <div />
</template>
