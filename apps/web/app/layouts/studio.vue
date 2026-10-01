<script setup lang="ts">
import { Settings, Users } from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const allowed = useCan()

const links = computed(() =>
  [
    {
      to: '/studio/settings',
      label: t('nav.settings'),
      icon: Settings,
      show: allowed('settings.manage'),
    },
    { to: '/studio/members', label: t('nav.members'), icon: Users, show: allowed('members.view') },
  ].filter((l) => l.show),
)
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <SiteHeader />
    <div class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 md:flex-row">
      <nav class="md:w-48 md:flex-none" :aria-label="t('nav.studio')">
        <p class="mb-3 font-mono text-micro text-muted uppercase">{{ t('nav.studio') }}</p>
        <ul class="flex gap-1 md:flex-col">
          <li v-for="l in links" :key="l.to">
            <NuxtLink :to="localePath(l.to)" class="studio-link">
              <component :is="l.icon" :size="16" aria-hidden="true" />
              {{ l.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <main class="min-w-0 flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.studio-link {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-md);
  color: var(--muted);
  text-decoration: none;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.studio-link:hover {
  background: var(--hover);
  color: var(--ink);
}

.studio-link.router-link-active {
  background: var(--select);
  color: var(--cobalt);
}
</style>
