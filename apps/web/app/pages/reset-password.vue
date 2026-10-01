<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { site } = useSession()
const { pending, error, run } = useAction()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : null))
const linkFailed = computed(() => typeof route.query.error === 'string')

const email = ref('')
const sentTo = ref<string | null>(null)
const password = ref('')
const done = ref(false)

useHead({ title: () => (token.value ? t('auth.reset.title') : t('auth.reset.requestTitle')) })

async function request() {
  const result = await run('request', () =>
    authClient().requestPasswordReset({
      email: email.value,
      redirectTo: localePath('/reset-password'),
    }),
  )
  if (result.ok) sentTo.value = email.value
}

async function reset() {
  const result = await run('reset', () =>
    authClient().resetPassword({ newPassword: password.value, token: token.value! }),
  )
  if (result.ok) done.value = true
}
</script>

<template>
  <div>
    <template v-if="done">
      <PageHeading
        :spec="t('auth.reset.spec')"
        :title="t('auth.reset.done')"
        :lead="t('auth.reset.doneBody')"
      />
      <UiButton as-child variant="primary">
        <NuxtLink :to="localePath('/sign-in')">{{ t('auth.signIn.title') }}</NuxtLink>
      </UiButton>
    </template>

    <template v-else-if="token">
      <PageHeading
        :spec="`${site?.title ?? 'Cairn'} · ${t('auth.reset.spec')}`"
        :title="t('auth.reset.title')"
      />
      <form class="grid gap-4" @submit.prevent="reset">
        <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
        <UiField :label="t('auth.reset.newPassword')" :hint="t('auth.passwordHint')">
          <PasswordInput
            v-model="password"
            autocomplete="new-password"
            minlength="10"
            maxlength="128"
            required
          />
        </UiField>
        <UiButton type="submit" variant="primary" :loading="pending === 'reset'">{{
          t('auth.reset.submit')
        }}</UiButton>
      </form>
    </template>

    <template v-else>
      <PageHeading
        :spec="`${site?.title ?? 'Cairn'} · ${t('auth.reset.spec')}`"
        :title="t('auth.reset.requestTitle')"
        :lead="sentTo || !site?.mail ? undefined : t('auth.reset.requestBody')"
      />
      <UiNotice v-if="site && !site.mail" tone="amber">{{ t('auth.reset.noMail') }}</UiNotice>
      <UiNotice v-else-if="sentTo" tone="success" :title="t('auth.reset.sentTitle')">
        {{ t('auth.reset.sentBody', { email: sentTo }) }}
      </UiNotice>
      <form v-else class="grid gap-4" @submit.prevent="request">
        <UiNotice v-if="linkFailed" tone="danger">{{ t('auth.reset.invalid') }}</UiNotice>
        <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
        <UiField :label="t('common.email')">
          <UiInput v-model="email" type="email" autocomplete="email" required />
        </UiField>
        <UiButton type="submit" variant="primary" :loading="pending === 'request'">{{
          t('auth.reset.request')
        }}</UiButton>
      </form>
      <p class="mt-6 border-t border-line pt-6 text-meta text-muted">
        <NuxtLink :to="localePath('/sign-in')" class="text-link">{{
          t('auth.reset.back')
        }}</NuxtLink>
      </p>
    </template>
  </div>
</template>
