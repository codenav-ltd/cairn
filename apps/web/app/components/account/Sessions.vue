<script setup lang="ts">
import { Laptop } from 'lucide-vue-next'

interface DeviceSession {
  id: string
  token: string
  createdAt: Date | string
  userAgent?: string | null
  ipAddress?: string | null
}

const { t } = useI18n()
const toast = useToast()
const dates = useDates()
const { pending, error, run } = useAction()

const sessions = ref<DeviceSession[] | null>(null)
const currentToken = ref<string | null>(null)

const others = computed(() => sessions.value?.filter((s) => s.token !== currentToken.value) ?? [])

function device(agent?: string | null) {
  if (!agent) return t('account.sessions.unknownDevice')
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /Firefox\//.test(agent)
      ? 'Firefox'
      : /Chrome\//.test(agent)
        ? 'Chrome'
        : /Safari\//.test(agent)
          ? 'Safari'
          : null
  const os = /Windows/.test(agent)
    ? 'Windows'
    : /iPhone|iPad/.test(agent)
      ? 'iOS'
      : /Mac OS X/.test(agent)
        ? 'macOS'
        : /Android/.test(agent)
          ? 'Android'
          : /Linux/.test(agent)
            ? 'Linux'
            : null
  return [browser, os].filter(Boolean).join(' · ') || t('account.sessions.unknownDevice')
}

async function load() {
  const [list, current] = await Promise.all([
    run('load', () => authClient().listSessions()),
    authClient().getSession(),
  ])
  currentToken.value = current.data?.session.token ?? null
  sessions.value = list.ok ? ((list.value.data ?? []) as DeviceSession[]) : []
}

async function revoke(s: DeviceSession) {
  const result = await run(`revoke:${s.id}`, () => authClient().revokeSession({ token: s.token }))
  if (result.ok) {
    sessions.value = sessions.value?.filter((x) => x.id !== s.id) ?? null
    toast.success(t('account.sessions.revoked'))
  }
}

async function revokeOthers() {
  const result = await run('others', () => authClient().revokeOtherSessions())
  if (result.ok) {
    sessions.value = sessions.value?.filter((s) => s.token === currentToken.value) ?? null
    toast.success(t('account.sessions.revokedOthers'))
  }
}

onMounted(load)
</script>

<template>
  <section class="panel">
    <h2 class="panel-title">{{ t('account.sessions.title') }}</h2>
    <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
    <div v-if="sessions === null" class="h-24 animate-pulse rounded-md bg-surface-2" />
    <ul v-else class="divide-y divide-line rounded-md border border-line">
      <li v-for="s in sessions" :key="s.id" class="flex items-center gap-3 px-4 py-3">
        <Laptop :size="16" class="text-muted" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="truncate">{{ device(s.userAgent) }}</p>
          <p class="font-mono text-micro text-muted">
            {{ t('account.sessions.signedIn', { date: dates.dateTime(s.createdAt) }) }}
            <template v-if="s.ipAddress"> · {{ s.ipAddress }}</template>
          </p>
        </div>
        <UiBadge v-if="s.token === currentToken" tone="cobalt">{{
          t('account.sessions.current')
        }}</UiBadge>
        <UiButton
          v-else
          size="sm"
          variant="ghost"
          :loading="pending === `revoke:${s.id}`"
          @click="revoke(s)"
        >
          {{ t('account.sessions.revoke') }}
        </UiButton>
      </li>
    </ul>
    <div v-if="others.length > 1" class="panel-actions">
      <UiButton :loading="pending === 'others'" @click="revokeOthers">{{
        t('account.sessions.revokeOthers')
      }}</UiButton>
    </div>
  </section>
</template>
