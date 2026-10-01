<script setup lang="ts">
import type { Member, Role, UpdateMember } from '@cairnhq/contracts'
import { MoreHorizontal } from 'lucide-vue-next'

definePageMeta({ layout: 'studio', middleware: 'studio' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const dates = useDates()
const allowed = useCan()
const { site, me } = useSession()
const { pending, error, run } = useAction()

if (!allowed('members.view')) {
  throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
}

const { data: members, error: loadError } = await useAsyncData('studio:members', () =>
  api<Member[]>('/api/members'),
)

const order = { pending: 0, active: 1, suspended: 2 } as const
const sorted = computed(() =>
  [...(members.value ?? [])].sort((a, b) => order[a.status] - order[b.status]),
)
const waiting = computed(
  () => members.value?.filter((m) => m.status === 'pending' && m.emailVerified).length ?? 0,
)

const roleTarget = ref<Member | null>(null)
const nextRole = ref<Exclude<Role, 'owner'>>('member')
const suspending = ref<Member | null>(null)

const roleOptions = computed(() =>
  (['member', 'editor', 'moderator'] as const).map((r) => ({
    value: r,
    label: t(`roles.${r}`),
    description: t(`roleHints.${r}`),
  })),
)

const canSetRole = (m: Member) =>
  (['member', 'editor', 'moderator'] as const).some((role) =>
    allowed('member.setRole', { user: m, role }),
  )
const canSetStatus = (m: Member) => allowed('member.setStatus', { user: m })

async function update(m: Member, patch: UpdateMember, done: string) {
  const result = await run(`update:${m.id}`, () =>
    api<Member>(`/api/members/${m.id}`, { method: 'PATCH', body: patch }),
  )
  if (result.ok && members.value) {
    members.value = members.value.map((x) => (x.id === m.id ? result.value : x))
    toast.success(done)
  }
  return result.ok
}

function openRole(m: Member) {
  nextRole.value = m.role === 'owner' ? 'member' : m.role
  roleTarget.value = m
}

async function saveRole() {
  const m = roleTarget.value
  if (!m) return
  if (
    await update(m, { role: nextRole.value }, t('studio.members.roleChanged', { name: m.name }))
  ) {
    roleTarget.value = null
  }
}

async function suspend() {
  const m = suspending.value
  if (!m) return
  await update(m, { status: 'suspended' }, t('studio.members.suspended', { name: m.name }))
  suspending.value = null
}

useHead({ title: () => t('nav.members') })
</script>

<template>
  <div class="grid max-w-3xl gap-6">
    <PageHeading
      :spec="`${site?.title ?? 'Cairn'} · ${t('nav.studio')}`"
      :title="t('nav.members')"
    />

    <UiNotice v-if="loadError" tone="danger">{{ t('errors.generic') }}</UiNotice>
    <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
    <UiNotice v-if="waiting" tone="amber">{{
      t('studio.members.waiting', { count: waiting }, waiting)
    }}</UiNotice>

    <StudioInvitations />

    <section class="panel">
      <h2 class="panel-title">{{ t('studio.members.title') }}</h2>
      <div v-if="!members && !loadError" class="h-40 animate-pulse rounded-md bg-surface-2" />
      <ul v-else class="divide-y divide-line rounded-md border border-line">
        <li v-for="m in sorted" :key="m.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
          <UiAvatar :name="m.name" :src="m.image" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold">
              {{ m.name }}
              <span v-if="m.id === me?.id" class="font-normal text-muted"
                >· {{ t('studio.members.you') }}</span
              >
            </p>
            <p class="truncate font-mono text-micro text-muted">
              {{ m.email }} · {{ t('studio.members.joined', { date: dates.date(m.createdAt) }) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UiBadge :tone="m.role === 'owner' ? 'cobalt' : 'neutral'">{{
              t(`roles.${m.role}`)
            }}</UiBadge>
            <UiBadge v-if="!m.emailVerified" tone="amber">{{ t('statuses.unverified') }}</UiBadge>
            <UiBadge
              v-else-if="m.status !== 'active'"
              :tone="m.status === 'suspended' ? 'danger' : 'amber'"
            >
              {{ t(`statuses.${m.status}`) }}
            </UiBadge>
          </div>
          <UiButton
            v-if="m.status === 'pending' && m.emailVerified && canSetStatus(m)"
            size="sm"
            variant="primary"
            :loading="pending === `update:${m.id}`"
            @click="update(m, { status: 'active' }, t('studio.members.approved', { name: m.name }))"
          >
            {{ t('studio.members.approve') }}
          </UiButton>
          <UiMenu v-if="canSetRole(m) || canSetStatus(m)">
            <template #trigger>
              <UiButton
                size="sm"
                variant="ghost"
                :aria-label="t('studio.members.actions', { name: m.name })"
              >
                <MoreHorizontal :size="16" aria-hidden="true" />
              </UiButton>
            </template>
            <UiMenuItem v-if="canSetRole(m)" @select="openRole(m)">{{
              t('studio.members.changeRole')
            }}</UiMenuItem>
            <UiMenuItem
              v-if="canSetStatus(m) && m.status === 'suspended'"
              @select="
                update(m, { status: 'active' }, t('studio.members.restored', { name: m.name }))
              "
            >
              {{ t('studio.members.restore') }}
            </UiMenuItem>
            <UiMenuItem v-else-if="canSetStatus(m)" danger @select="suspending = m">
              {{ t('studio.members.suspend') }}
            </UiMenuItem>
          </UiMenu>
        </li>
      </ul>
    </section>

    <UiDialog
      :open="Boolean(roleTarget)"
      :title="t('studio.members.changeRoleTitle', { name: roleTarget?.name ?? '' })"
      :close-label="t('common.close')"
      @update:open="(v) => !v && (roleTarget = null)"
    >
      <UiField :label="t('studio.invites.role')">
        <UiSelect v-model="nextRole" :options="roleOptions" />
      </UiField>
      <template #footer>
        <UiButton @click="roleTarget = null">{{ t('common.cancel') }}</UiButton>
        <UiButton
          variant="primary"
          :loading="pending === `update:${roleTarget?.id}`"
          @click="saveRole"
        >
          {{ t('studio.members.changeRole') }}
        </UiButton>
      </template>
    </UiDialog>

    <UiDialog
      :open="Boolean(suspending)"
      :title="t('studio.members.suspendTitle', { name: suspending?.name ?? '' })"
      :description="t('studio.members.suspendBody')"
      :close-label="t('common.close')"
      @update:open="(v) => !v && (suspending = null)"
    >
      <template #footer>
        <UiButton @click="suspending = null">{{ t('common.cancel') }}</UiButton>
        <UiButton
          variant="danger"
          :loading="pending === `update:${suspending?.id}`"
          @click="suspend"
        >
          {{ t('studio.members.suspend') }}
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
