<script setup lang="ts">
const { t } = useI18n()
const { site } = useSession()

useHead({ title: () => site.value?.title ?? 'Cairn' })
</script>

<template>
  <main
    class="mx-auto flex w-full max-w-(--measure) flex-1 flex-col justify-center gap-6 px-6 pb-24"
  >
    <p class="font-mono text-meta text-muted">site · ○ seed · rev 1</p>
    <h1 class="title font-display text-h1 md:text-title">{{ site?.title ?? 'Cairn' }}</h1>
    <p class="text-body text-muted">{{ site?.description || t('site.tagline') }}</p>
  </main>
</template>

<style scoped>
.title {
  font-weight: 650;
  font-stretch: 90%;
  letter-spacing: -0.02em;
}
</style>
