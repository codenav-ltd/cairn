<script setup lang="ts">
const head = useLocaleHead()
const { t } = useI18n()
const { site } = useSession()

useHead(() => ({
  htmlAttrs: { lang: head.value.htmlAttrs.lang },
  link: head.value.link,
  meta: head.value.meta,
  titleTemplate: (title) => {
    const name = site.value?.title ?? 'Cairn'
    return title && title !== name ? `${title} · ${name}` : name
  },
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <UiToaster :close-label="t('common.close')" :region-label="t('common.notifications')" />
  </ClientOnly>
</template>
