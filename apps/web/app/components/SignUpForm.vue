<script setup lang="ts">
const props = defineProps<{ submitLabel: string; returnTo: string }>()

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { site, me, refresh } = useSession()
const { pending, error, run } = useAction()
const errorMessage = useErrorMessage()

// GitHub sign-up failures come back as ?error=CODE on returnTo.
const returned = [route.query.error].flat()[0]
if (typeof returned === 'string') error.value = errorMessage({ code: returned })

const name = ref('')
const email = ref('')
const password = ref('')

const next = computed(() => safeNext(route.query.next) ?? localePath('/'))

async function withPassword() {
  const result = await run('password', () =>
    authClient().signUp.email({
      name: name.value.trim(),
      email: email.value,
      password: password.value,
      callbackURL: localePath('/verify'),
    }),
  )
  if (!result.ok) return
  await refresh()
  if (me.value && !me.value.emailVerified) return navigateTo(localePath('/verify'))
  if (me.value?.status === 'pending') return navigateTo(localePath('/account'))
  await navigateTo(next.value)
}

async function withGithub() {
  await run('github', () =>
    authClient().signIn.social({
      provider: 'github',
      callbackURL: next.value,
      errorCallbackURL: props.returnTo,
      requestSignUp: true,
    }),
  )
}
</script>

<template>
  <div class="grid gap-6">
    <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>

    <template v-if="site?.methods.github">
      <UiButton :loading="pending === 'github'" :disabled="Boolean(pending)" @click="withGithub">
        <GithubMark />
        {{ t('auth.github') }}
      </UiButton>
      <OrDivider v-if="site.methods.password" />
    </template>

    <form v-if="site?.methods.password" class="grid gap-4" @submit.prevent="withPassword">
      <UiField :label="t('common.name')" :hint="t('auth.signUp.nameHint')">
        <UiInput v-model="name" autocomplete="name" maxlength="80" required />
      </UiField>
      <UiField :label="t('common.email')">
        <UiInput v-model="email" type="email" autocomplete="email" required />
      </UiField>
      <UiField :label="t('common.password')" :hint="t('auth.passwordHint')">
        <PasswordInput
          v-model="password"
          autocomplete="new-password"
          minlength="10"
          maxlength="128"
          required
        />
      </UiField>
      <UiButton
        type="submit"
        variant="primary"
        :loading="pending === 'password'"
        :disabled="Boolean(pending)"
      >
        {{ props.submitLabel }}
      </UiButton>
    </form>

    <p class="text-meta text-muted">{{ t('auth.signUp.passkeyLater') }}</p>
  </div>
</template>
