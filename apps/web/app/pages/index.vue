<script setup lang="ts">
const { t, locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const otherLocales = computed(() => locales.value.filter((l) => l.code !== locale.value))

useHead({ title: 'Cairn' })
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-(--measure) flex-col justify-center gap-6 px-6">
    <p class="font-mono text-meta text-muted">site · ○ seed · rev 1</p>
    <h1 class="title font-display text-h1 md:text-title">Cairn</h1>
    <p class="text-body text-muted">{{ t('site.tagline') }}</p>
    <nav :aria-label="t('locale.switch')" class="font-mono text-meta">
      <NuxtLink
        v-for="l in otherLocales"
        :key="l.code"
        :to="switchLocalePath(l.code)"
        class="rounded-sm text-cobalt underline-offset-4 hover:underline"
      >
        {{ l.name }}
      </NuxtLink>
    </nav>
  </main>
</template>

<style scoped>
.title {
  font-weight: 650;
  font-stretch: 90%;
  letter-spacing: -0.02em;
}
</style>
