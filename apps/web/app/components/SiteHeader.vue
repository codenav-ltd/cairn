<script setup lang="ts">
const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()
const { me, site } = useSession()

const otherLocales = computed(() => locales.value.filter((l) => l.code !== locale.value))
const onAuthPage = computed(() => /\/(sign-in|sign-up|invite)\b/.test(route.path))
</script>

<template>
  <header class="border-b border-line">
    <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
      <NuxtLink :to="localePath('/')" class="site-name rounded-sm font-display text-h4">
        {{ site?.title ?? 'Cairn' }}
      </NuxtLink>
      <nav class="flex items-center gap-2" :aria-label="t('nav.label')">
        <NuxtLink
          v-for="l in otherLocales"
          :key="l.code"
          :to="switchLocalePath(l.code)"
          class="link rounded-sm px-2 py-1 font-mono text-meta text-muted"
        >
          {{ l.name }}
        </NuxtLink>
        <UserMenu v-if="me" />
        <UiButton v-else-if="!onAuthPage" as-child size="sm" variant="ghost">
          <NuxtLink :to="{ path: localePath('/sign-in'), query: { next: route.fullPath } }">
            {{ t('nav.signIn') }}
          </NuxtLink>
        </UiButton>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-name {
  font-weight: 650;
  font-stretch: 90%;
  letter-spacing: -0.01em;
}

.link {
  transition: color var(--dur-fast) var(--ease-out);
}

.link:hover {
  color: var(--ink);
}
</style>
