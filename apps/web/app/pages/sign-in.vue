<script setup lang="ts">
import { KeyRound } from 'lucide-vue-next'

definePageMeta({ layout: 'auth', middleware: 'guest' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const errorMessage = useErrorMessage()
const { site, refresh } = useSession()
const { pending, error, run } = useAction()

const next = computed(() => safeNext(route.query.next) ?? localePath('/'))
const methods = computed(() => site.value?.methods)
const both = computed(() => methods.value?.password && methods.value?.magicLink)
const mode = ref<'password' | 'link'>(methods.value?.password === false ? 'link' : 'password')

const email = ref('')
const password = ref('')
const linkSentTo = ref<string | null>(null)

if (typeof route.query.error === 'string') {
  error.value = errorMessage({ code: route.query.error })
}

useHead({ title: () => t('auth.signIn.title') })

async function finish() {
  await refresh()
  await navigateTo(next.value)
}

async function withPassword() {
  const result = await run('password', () =>
    authClient().signIn.email({ email: email.value, password: password.value }),
  )
  if (result.ok) await finish()
}

async function withPasskey() {
  const result = await run('passkey', () => authClient().signIn.passkey())
  if (result.ok) await finish()
}

async function withGithub() {
  await run('github', () =>
    authClient().signIn.social({
      provider: 'github',
      callbackURL: next.value,
      errorCallbackURL: localePath('/sign-in'),
    }),
  )
}

async function withLink() {
  const result = await run('link', () =>
    authClient().signIn.magicLink({
      email: email.value,
      callbackURL: next.value,
      errorCallbackURL: localePath('/sign-in'),
    }),
  )
  if (result.ok) linkSentTo.value = email.value
}
</script>

<template>
  <div>
    <PageHeading
      :spec="`${site?.title ?? 'Cairn'} · ${t('auth.signIn.spec')}`"
      :title="t('auth.signIn.title')"
    />

    <UiNotice v-if="!site" tone="danger">{{ t('auth.unavailable') }}</UiNotice>

    <div v-else class="grid gap-6">
      <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>

      <div v-if="methods?.passkey || methods?.github" class="grid gap-2">
        <UiButton
          v-if="methods.passkey"
          :loading="pending === 'passkey'"
          :disabled="Boolean(pending)"
          @click="withPasskey"
        >
          <KeyRound :size="16" aria-hidden="true" />
          {{ t('auth.signIn.passkey') }}
        </UiButton>
        <UiButton
          v-if="methods.github"
          :loading="pending === 'github'"
          :disabled="Boolean(pending)"
          @click="withGithub"
        >
          <GithubMark />
          {{ t('auth.github') }}
        </UiButton>
      </div>

      <OrDivider
        v-if="(methods?.passkey || methods?.github) && (methods?.password || methods?.magicLink)"
      />

      <div v-if="both" class="segmented" role="group" :aria-label="t('auth.signIn.method')">
        <button type="button" :aria-pressed="mode === 'password'" @click="mode = 'password'">
          {{ t('auth.signIn.withPassword') }}
        </button>
        <button type="button" :aria-pressed="mode === 'link'" @click="mode = 'link'">
          {{ t('auth.signIn.withLink') }}
        </button>
      </div>

      <form
        v-if="methods?.password && mode === 'password'"
        class="grid gap-4"
        @submit.prevent="withPassword"
      >
        <UiField :label="t('common.email')">
          <UiInput v-model="email" type="email" autocomplete="username webauthn" required />
        </UiField>
        <UiField :label="t('common.password')">
          <PasswordInput v-model="password" autocomplete="current-password" required />
        </UiField>
        <div class="flex items-center justify-between gap-4">
          <NuxtLink :to="localePath('/reset-password')" class="text-link text-meta">
            {{ t('auth.signIn.forgot') }}
          </NuxtLink>
          <UiButton
            type="submit"
            variant="primary"
            :loading="pending === 'password'"
            :disabled="Boolean(pending)"
          >
            {{ t('auth.signIn.submit') }}
          </UiButton>
        </div>
      </form>

      <template v-else-if="methods?.magicLink">
        <UiNotice v-if="linkSentTo" tone="success" :title="t('auth.signIn.linkSentTitle')">
          {{ t('auth.signIn.linkSentBody', { email: linkSentTo }) }}
        </UiNotice>
        <form v-else class="grid gap-4" @submit.prevent="withLink">
          <UiField :label="t('common.email')">
            <UiInput v-model="email" type="email" autocomplete="email" required />
          </UiField>
          <UiButton
            type="submit"
            variant="primary"
            :loading="pending === 'link'"
            :disabled="Boolean(pending)"
          >
            {{ t('auth.signIn.linkSubmit') }}
          </UiButton>
        </form>
      </template>

      <p class="border-t border-line pt-6 text-meta text-muted">
        <template v-if="site.registration === 'invite'">
          {{ t('auth.signIn.inviteOnly', { site: site.title }) }}
        </template>
        <template v-else>
          {{ t('auth.signIn.noAccount') }}
          <NuxtLink :to="{ path: localePath('/sign-up'), query: route.query }" class="text-link">
            {{ t('auth.signIn.join') }}
          </NuxtLink>
        </template>
      </p>
    </div>
  </div>
</template>
