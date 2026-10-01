<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const toast = useToast()
const { me, site } = useSession()
const { pending, error, run } = useAction()

const linkFailed = typeof route.query.error === 'string'

useHead({ title: () => t('auth.verify.title') })

async function resend() {
  if (!me.value) return
  const result = await run('resend', () =>
    authClient().sendVerificationEmail({
      email: me.value!.email,
      callbackURL: localePath('/verify'),
    }),
  )
  if (result.ok) toast.success(t('auth.verify.resent'))
}
</script>

<template>
  <div>
    <template v-if="me?.emailVerified">
      <PageHeading
        :spec="`${site?.title ?? 'Cairn'} · ${t('auth.verify.spec')}`"
        :title="t('auth.verify.doneTitle')"
        :lead="me.status === 'pending' ? t('account.pendingBody') : t('auth.verify.doneBody')"
      />
      <UiButton as-child variant="primary">
        <NuxtLink :to="localePath(me.status === 'pending' ? '/account' : '/')">{{
          t('common.continue')
        }}</NuxtLink>
      </UiButton>
    </template>

    <template v-else-if="me">
      <PageHeading
        :spec="`${site?.title ?? 'Cairn'} · ${t('auth.verify.spec')}`"
        :title="t('auth.verify.title')"
        :lead="t('auth.verify.body', { email: me.email })"
      />
      <div class="grid gap-4">
        <UiNotice v-if="linkFailed" tone="danger">{{ t('auth.verify.failed') }}</UiNotice>
        <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
        <UiButton :loading="pending === 'resend'" @click="resend">{{
          t('auth.verify.resend')
        }}</UiButton>
      </div>
    </template>

    <template v-else>
      <PageHeading
        :spec="t('auth.verify.spec')"
        :title="t('auth.verify.title')"
        :lead="t('auth.verify.signedOut')"
      />
      <UiNotice v-if="linkFailed" tone="danger" class="mb-6">{{
        t('auth.verify.failed')
      }}</UiNotice>
      <UiButton as-child variant="primary">
        <NuxtLink :to="{ path: localePath('/sign-in'), query: { next: localePath('/verify') } }">
          {{ t('auth.signIn.title') }}
        </NuxtLink>
      </UiButton>
    </template>
  </div>
</template>
