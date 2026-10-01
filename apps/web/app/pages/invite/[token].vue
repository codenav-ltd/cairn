<script setup lang="ts">
import type { InvitationPreview } from '@cairnhq/contracts'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const api = useApi()
const dates = useDates()
const { me, signOut } = useSession()
const { pending, error, run } = useAction()

const token = String(route.params.token)

// Opening the invitation also sets the cookie that sign-up reads.
const { data: preview } = await useAsyncData(`invite:${token}`, () =>
  api<InvitationPreview>(`/api/invites/${encodeURIComponent(token)}`).catch(() => null),
)

useHead({
  title: () =>
    preview.value
      ? t('auth.invite.title', { site: preview.value.siteTitle })
      : t('auth.invite.invalidTitle'),
  meta: [{ name: 'robots', content: 'noindex' }],
})

async function switchAccount() {
  await run('signOut', () => signOut())
}
</script>

<template>
  <div>
    <template v-if="preview">
      <PageHeading
        :spec="`${preview.siteTitle} · ${t('auth.invite.spec')}`"
        :title="t('auth.invite.title', { site: preview.siteTitle })"
        :lead="
          preview.inviterName
            ? t('auth.invite.from', {
                inviter: preview.inviterName,
                role: t(`roles.${preview.role}`),
              })
            : t('auth.invite.fromAnonymous', { role: t(`roles.${preview.role}`) })
        "
      />

      <div class="grid gap-6">
        <dl class="grid gap-2 font-mono text-meta">
          <div v-if="preview.email" class="flex justify-between gap-4">
            <dt class="text-muted">{{ t('auth.invite.for') }}</dt>
            <dd>{{ preview.email }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted">{{ t('auth.invite.role') }}</dt>
            <dd>
              <UiBadge tone="cobalt">{{ t(`roles.${preview.role}`) }}</UiBadge>
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted">{{ t('auth.invite.expires') }}</dt>
            <dd>{{ dates.dateTime(preview.expiresAt) }}</dd>
          </div>
        </dl>

        <template v-if="me">
          <UiNotice tone="amber">{{ t('auth.invite.signedInAs', { email: me.email }) }}</UiNotice>
          <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
          <UiButton :loading="pending === 'signOut'" @click="switchAccount">{{
            t('nav.signOut')
          }}</UiButton>
        </template>

        <template v-else>
          <p v-if="preview.email" class="text-meta text-muted">
            {{ t('auth.invite.useBoundEmail') }}
          </p>
          <SignUpForm :submit-label="t('auth.invite.accept')" :return-to="route.path" />
          <p class="border-t border-line pt-6 text-meta text-muted">
            {{ t('auth.signUp.haveAccount') }}
            <NuxtLink :to="localePath('/sign-in')" class="text-link">{{
              t('auth.signIn.title')
            }}</NuxtLink>
          </p>
        </template>
      </div>
    </template>

    <template v-else>
      <PageHeading :spec="t('auth.invite.spec')" :title="t('auth.invite.invalidTitle')" />
      <p class="text-muted">{{ t('auth.invite.invalidBody') }}</p>
      <UiButton as-child class="mt-6">
        <NuxtLink :to="localePath('/')">{{ t('common.goHome') }}</NuxtLink>
      </UiButton>
    </template>
  </div>
</template>
