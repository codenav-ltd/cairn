<script setup lang="ts">
const props = defineProps<{ accounts: { id: string; providerId: string }[] | null }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const { pending, error, run } = useAction()

const github = computed(() => props.accounts?.find((a) => a.providerId === 'github'))

async function connect() {
  await run('connect', () =>
    authClient().linkSocial({
      provider: 'github',
      callbackURL: localePath('/account'),
      errorCallbackURL: localePath('/account'),
    }),
  )
}

async function disconnect() {
  const account = github.value
  if (!account) return
  const result = await run('disconnect', () =>
    authClient().unlinkAccount({ accountId: account.id }),
  )
  if (result.ok) {
    toast.success(t('account.connections.disconnected'))
    emit('changed')
  }
}
</script>

<template>
  <section class="panel">
    <h2 class="panel-title">{{ t('account.connections.title') }}</h2>
    <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
    <div v-if="props.accounts === null" class="h-12 animate-pulse rounded-md bg-surface-2" />
    <div v-else class="flex items-center gap-3 rounded-md border border-line px-4 py-3">
      <GithubMark />
      <span class="flex-1">GitHub</span>
      <template v-if="github">
        <UiBadge tone="success">{{ t('account.connections.connected') }}</UiBadge>
        <UiButton size="sm" variant="ghost" :loading="pending === 'disconnect'" @click="disconnect">
          {{ t('account.connections.disconnect') }}
        </UiButton>
      </template>
      <UiButton v-else size="sm" :loading="pending === 'connect'" @click="connect">
        {{ t('account.connections.connect') }}
      </UiButton>
    </div>
  </section>
</template>
