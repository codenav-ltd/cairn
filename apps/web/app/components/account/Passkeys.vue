<script setup lang="ts">
import { KeyRound } from 'lucide-vue-next'

interface Passkey {
  id: string
  name?: string | null
  createdAt: Date | string
  deviceType?: string
}

const { t } = useI18n()
const toast = useToast()
const dates = useDates()
const { pending, error, run } = useAction()

const passkeys = ref<Passkey[] | null>(null)
const removing = ref<Passkey | null>(null)

async function load() {
  const result = await run('load', () => authClient().passkey.listUserPasskeys())
  passkeys.value = result.ok ? ((result.value.data ?? []) as Passkey[]) : []
}

async function add() {
  const result = await run('add', () => authClient().passkey.addPasskey())
  if (result.ok) {
    toast.success(t('account.passkeys.added'))
    await load()
  }
}

async function remove() {
  const target = removing.value
  if (!target) return
  const result = await run('remove', () => authClient().passkey.deletePasskey({ id: target.id }))
  removing.value = null
  if (result.ok) {
    toast.success(t('account.passkeys.removed'))
    passkeys.value = passkeys.value?.filter((p) => p.id !== target.id) ?? null
  }
}

onMounted(load)
</script>

<template>
  <section class="panel">
    <h2 class="panel-title">{{ t('account.passkeys.title') }}</h2>
    <p class="panel-lead">{{ t('account.passkeys.lead') }}</p>
    <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>

    <div v-if="passkeys === null" class="h-12 animate-pulse rounded-md bg-surface-2" />
    <p v-else-if="passkeys.length === 0" class="text-muted">{{ t('account.passkeys.empty') }}</p>
    <ul v-else class="divide-y divide-line rounded-md border border-line">
      <li v-for="p in passkeys" :key="p.id" class="flex items-center gap-3 px-4 py-3">
        <KeyRound :size="16" class="text-muted" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="truncate">{{ p.name || t('account.passkeys.unnamed') }}</p>
          <p class="font-mono text-micro text-muted">
            {{ t('account.passkeys.addedOn', { date: dates.date(p.createdAt) }) }}
          </p>
        </div>
        <UiButton size="sm" variant="ghost" @click="removing = p">{{
          t('account.passkeys.remove')
        }}</UiButton>
      </li>
    </ul>

    <div class="panel-actions">
      <UiButton :loading="pending === 'add'" @click="add">{{ t('account.passkeys.add') }}</UiButton>
    </div>

    <UiDialog
      :open="Boolean(removing)"
      :title="t('account.passkeys.removeTitle')"
      :description="t('account.passkeys.removeBody')"
      :close-label="t('common.close')"
      @update:open="(open) => !open && (removing = null)"
    >
      <template #footer>
        <UiButton @click="removing = null">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="danger" :loading="pending === 'remove'" @click="remove">
          {{ t('account.passkeys.remove') }}
        </UiButton>
      </template>
    </UiDialog>
  </section>
</template>
