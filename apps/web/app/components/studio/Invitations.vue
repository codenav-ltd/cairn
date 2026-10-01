<script setup lang="ts">
import type { CreatedInvitation, Invitation, Role } from '@cairnhq/contracts'
import { Copy, Mail } from 'lucide-vue-next'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const dates = useDates()
const allowed = useCan()
const { site } = useSession()
const { pending, error, run } = useAction()

const { data: invitations, refresh } = await useAsyncData('studio:invites', () =>
  api<Invitation[]>('/api/invites'),
)
const open = computed(() => invitations.value?.filter((i) => i.state === 'pending') ?? [])

const roleOptions = computed(() =>
  (['member', 'editor', 'moderator'] as const)
    .filter((role) => allowed('invitation.manage', { role }))
    .map((role) => ({
      value: role,
      label: t(`roles.${role}`),
      description: t(`roleHints.${role}`),
    })),
)

const creating = ref(false)
const role = ref<Exclude<Role, 'owner'>>('member')
const email = ref('')
const created = ref<CreatedInvitation | null>(null)
const revoking = ref<Invitation | null>(null)

function startCreate() {
  role.value = 'member'
  email.value = ''
  created.value = null
  creating.value = true
}

async function create() {
  const result = await run('create', () =>
    api<CreatedInvitation>('/api/invites', {
      method: 'POST',
      body: { role: role.value, email: email.value.trim() || undefined },
    }),
  )
  if (result.ok) {
    created.value = result.value
    await refresh()
  }
}

async function copy(url: string) {
  await navigator.clipboard.writeText(url)
  toast.success(t('common.copied'))
}

async function revoke() {
  const target = revoking.value
  if (!target) return
  const result = await run('revoke', () => api(`/api/invites/${target.id}`, { method: 'DELETE' }))
  revoking.value = null
  if (result.ok) {
    toast.success(t('studio.invites.revoked'))
    await refresh()
  }
}
</script>

<template>
  <section class="panel">
    <div class="flex items-start justify-between gap-4">
      <h2 class="panel-title">{{ t('studio.invites.title') }}</h2>
      <UiButton v-if="roleOptions.length" variant="primary" size="sm" @click="startCreate">
        {{ t('studio.invites.create') }}
      </UiButton>
    </div>
    <UiNotice v-if="error && !creating" tone="danger">{{ error }}</UiNotice>

    <p v-if="open.length === 0" class="text-muted">{{ t('studio.invites.empty') }}</p>
    <ul v-else class="divide-y divide-line rounded-md border border-line">
      <li v-for="i in open" :key="i.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
        <UiBadge tone="cobalt">{{ t(`roles.${i.role}`) }}</UiBadge>
        <span class="min-w-0 flex-1 truncate">{{ i.email ?? t('studio.invites.anyone') }}</span>
        <span class="font-mono text-micro text-muted">{{
          t('studio.invites.expires', { date: dates.date(i.expiresAt) })
        }}</span>
        <UiButton
          v-if="allowed('invitation.manage', { role: i.role })"
          size="sm"
          variant="ghost"
          @click="revoking = i"
        >
          {{ t('studio.invites.revoke') }}
        </UiButton>
      </li>
    </ul>

    <UiDialog
      v-model:open="creating"
      :title="created ? t('studio.invites.createdTitle') : t('studio.invites.create')"
      :description="
        created ? undefined : t('studio.invites.createLead', { site: site?.title ?? 'Cairn' })
      "
      :close-label="t('common.close')"
    >
      <template v-if="created">
        <UiNotice v-if="created.mailed" tone="success">
          <span class="inline-flex items-center gap-2">
            <Mail :size="16" aria-hidden="true" />
            {{ t('studio.invites.mailed', { email: created.invitation.email }) }}
          </span>
        </UiNotice>
        <p class="text-muted">{{ t('studio.invites.shareLink') }}</p>
        <div class="flex gap-2">
          <UiInput
            :model-value="created.url"
            readonly
            class="font-mono text-meta"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <UiButton :aria-label="t('common.copy')" @click="copy(created.url)">
            <Copy :size="16" aria-hidden="true" />
          </UiButton>
        </div>
      </template>
      <form v-else id="create-invite" class="grid gap-4" @submit.prevent="create">
        <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
        <UiField :label="t('studio.invites.role')">
          <UiSelect v-model="role" :options="roleOptions" />
        </UiField>
        <UiField
          :label="t('common.email')"
          :hint="site?.mail ? t('studio.invites.emailHint') : t('studio.invites.emailHintNoMail')"
          :optional="t('common.optional')"
        >
          <UiInput v-model="email" type="email" autocomplete="off" />
        </UiField>
      </form>
      <template #footer>
        <UiButton v-if="created" variant="primary" @click="creating = false">{{
          t('common.done')
        }}</UiButton>
        <template v-else>
          <UiButton @click="creating = false">{{ t('common.cancel') }}</UiButton>
          <UiButton
            type="submit"
            form="create-invite"
            variant="primary"
            :loading="pending === 'create'"
          >
            {{ t('studio.invites.send') }}
          </UiButton>
        </template>
      </template>
    </UiDialog>

    <UiDialog
      :open="Boolean(revoking)"
      :title="t('studio.invites.revokeTitle')"
      :description="t('studio.invites.revokeBody')"
      :close-label="t('common.close')"
      @update:open="(v) => !v && (revoking = null)"
    >
      <template #footer>
        <UiButton @click="revoking = null">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="danger" :loading="pending === 'revoke'" @click="revoke">{{
          t('studio.invites.revoke')
        }}</UiButton>
      </template>
    </UiDialog>
  </section>
</template>
