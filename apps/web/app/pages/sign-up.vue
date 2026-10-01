<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'guest' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { site } = useSession()

useHead({ title: () => t('auth.signUp.title') })
</script>

<template>
  <div>
    <PageHeading
      :spec="`${site?.title ?? 'Cairn'} · ${t('auth.signUp.spec')}`"
      :title="
        site?.registration === 'invite' ? t('auth.signUp.inviteOnlyTitle') : t('auth.signUp.title')
      "
    />

    <UiNotice v-if="!site" tone="danger">{{ t('auth.unavailable') }}</UiNotice>

    <p v-else-if="site.registration === 'invite'" class="text-muted">
      {{ t('auth.signUp.inviteOnlyBody', { site: site.title }) }}
    </p>

    <div v-else class="grid gap-6">
      <UiNotice v-if="site.registration === 'approval'">{{
        t('auth.signUp.approvalNote')
      }}</UiNotice>
      <SignUpForm :submit-label="t('auth.signUp.submit')" :return-to="localePath('/sign-up')" />
    </div>

    <p class="mt-6 border-t border-line pt-6 text-meta text-muted">
      {{ t('auth.signUp.haveAccount') }}
      <NuxtLink :to="{ path: localePath('/sign-in'), query: route.query }" class="text-link">
        {{ t('auth.signIn.title') }}
      </NuxtLink>
    </p>
  </div>
</template>
