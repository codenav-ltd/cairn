<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const errorMessage = useErrorMessage()
const { me, site, viewer, signOut } = useSession()
const { pending, error, run } = useAction()

const accounts = ref<{ id: string; providerId: string }[] | null>(null)
const linkError =
  typeof route.query.error === 'string' ? errorMessage({ code: route.query.error }) : null

useHead({ title: () => t('account.title') })

async function loadAccounts() {
  const result = await run('accounts', () => authClient().listAccounts())
  accounts.value = result.ok ? (result.value.data ?? []) : []
}

async function onSignOut() {
  const result = await run('signOut', () => signOut())
  if (result.ok) await navigateTo(localePath('/'))
}

onMounted(loadAccounts)
</script>

<template>
  <main v-if="me" class="mx-auto w-full max-w-2xl px-6 py-12">
    <PageHeading
      :spec="`${site?.title ?? 'Cairn'} · ${t('account.spec')}`"
      :title="t('account.title')"
    />

    <div class="grid gap-6">
      <UiNotice v-if="!me.emailVerified" tone="amber" :title="t('account.unverifiedTitle')">
        {{ t('account.unverifiedBody') }}
        <NuxtLink :to="localePath('/verify')" class="text-link">{{
          t('account.unverifiedAction')
        }}</NuxtLink>
      </UiNotice>
      <UiNotice
        v-else-if="viewer?.status === 'pending'"
        tone="amber"
        :title="t('account.pendingTitle')"
      >
        {{ t('account.pendingBody') }}
      </UiNotice>
      <UiNotice v-if="linkError" tone="danger">{{ linkError }}</UiNotice>
      <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>

      <AccountProfile />
      <AccountPassword
        :has-password="
          accounts === null ? null : accounts.some((a) => a.providerId === 'credential')
        "
      />
      <AccountPasskeys />
      <AccountConnections
        v-if="site?.methods.github"
        :accounts="accounts"
        @changed="loadAccounts"
      />
      <AccountSessions />

      <div class="flex justify-end">
        <UiButton variant="danger" :loading="pending === 'signOut'" @click="onSignOut">{{
          t('nav.signOut')
        }}</UiButton>
      </div>
    </div>
  </main>
</template>
