<script setup lang="ts">
import type {
  Locale,
  MailSettingsView,
  RegistrationMode,
  SiteSettings,
  UpdateSiteSettings,
} from '@cairnhq/contracts'

definePageMeta({ layout: 'studio', middleware: 'studio' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const api = useApi()
const toast = useToast()
const allowed = useCan()
const { site, refresh, signOut } = useSession()
const { pending, error, run } = useAction()

if (!allowed('settings.manage')) await navigateTo(localePath('/studio/members'), { replace: true })

const { data, error: loadError } = await useAsyncData('studio:settings', () =>
  Promise.all([api<SiteSettings>('/api/settings'), api<MailSettingsView>('/api/settings/mail')]),
)

const form = reactive({
  title: '',
  description: '',
  locale: 'en' as Locale,
  mode: 'invite' as RegistrationMode,
  password: true,
  magicLink: true,
})
const stale = ref(false)

watch(
  data,
  (d) => {
    if (!d) return
    const [s] = d
    Object.assign(form, {
      title: s.site.title,
      description: s.site.description,
      locale: s.site.locale,
      mode: s.registration.mode,
      password: s.auth.password,
      magicLink: s.auth.magicLink,
    })
  },
  { immediate: true },
)

const locales = [
  { value: 'en' as const, label: 'English' },
  { value: 'zh-CN' as const, label: '中文' },
]
const modes = computed(() =>
  (['invite', 'approval', 'open'] as const).map((m) => ({
    value: m,
    label: t(`studio.settings.modes.${m}.label`),
    description: t(`studio.settings.modes.${m}.description`),
  })),
)

useHead({ title: () => t('nav.settings') })

async function save(key: string, patch: UpdateSiteSettings, done: string) {
  const result = await run(key, () =>
    api<SiteSettings>('/api/settings', { method: 'PATCH', body: patch }),
  )
  if (result.ok) {
    toast.success(done)
    await refresh()
  } else if (result.code === 'session_not_fresh') stale.value = true
}

const saveSite = () =>
  save(
    'site',
    { site: { title: form.title, description: form.description, locale: form.locale } },
    t('studio.settings.siteSaved'),
  )

const saveAccess = () =>
  save(
    'access',
    {
      registration: { mode: form.mode },
      auth: { password: form.password, magicLink: form.magicLink },
    },
    t('studio.settings.accessSaved'),
  )

async function signInAgain() {
  await signOut()
  await navigateTo({ path: localePath('/sign-in'), query: { next: route.fullPath } })
}
</script>

<template>
  <div class="grid max-w-2xl gap-6">
    <PageHeading
      :spec="`${site?.title ?? 'Cairn'} · ${t('nav.studio')}`"
      :title="t('nav.settings')"
    />

    <UiNotice v-if="loadError" tone="danger">{{ t('errors.generic') }}</UiNotice>
    <UiNotice v-if="stale" tone="amber" :title="t('studio.settings.staleTitle')">
      <p>{{ t('studio.settings.staleBody') }}</p>
      <UiButton size="sm" class="mt-2" @click="signInAgain">{{
        t('studio.settings.signInAgain')
      }}</UiButton>
    </UiNotice>
    <UiNotice v-else-if="error" tone="danger">{{ error }}</UiNotice>

    <template v-if="data">
      <form class="panel" @submit.prevent="saveSite">
        <h2 class="panel-title">{{ t('studio.settings.site') }}</h2>
        <UiField :label="t('studio.settings.siteTitle')">
          <UiInput v-model="form.title" maxlength="80" required />
        </UiField>
        <UiField
          :label="t('studio.settings.description')"
          :hint="t('studio.settings.descriptionHint')"
          :optional="t('common.optional')"
        >
          <UiTextarea v-model="form.description" maxlength="300" rows="3" />
        </UiField>
        <UiField :label="t('studio.settings.language')" :hint="t('studio.settings.languageHint')">
          <UiSelect v-model="form.locale" :options="locales" />
        </UiField>
        <div class="panel-actions">
          <UiButton type="submit" variant="primary" :loading="pending === 'site'">{{
            t('common.save')
          }}</UiButton>
        </div>
      </form>

      <form class="panel" @submit.prevent="saveAccess">
        <h2 class="panel-title">{{ t('studio.settings.access') }}</h2>
        <p class="panel-lead">{{ t('studio.settings.accessLead') }}</p>
        <UiField :label="t('studio.settings.registration')">
          <UiSelect v-model="form.mode" :options="modes" />
        </UiField>
        <UiSwitch
          v-model="form.password"
          :label="t('studio.settings.password')"
          :description="t('studio.settings.passwordHint')"
        />
        <UiSwitch
          v-model="form.magicLink"
          :label="t('studio.settings.magicLink')"
          :description="
            site?.mail ? t('studio.settings.magicLinkHint') : t('studio.settings.magicLinkNoMail')
          "
        />
        <dl class="grid gap-2 border-t border-line pt-4 font-mono text-meta">
          <div class="flex justify-between gap-4">
            <dt class="text-muted">{{ t('studio.settings.passkeys') }}</dt>
            <dd>
              <UiBadge tone="success">{{ t('studio.settings.alwaysOn') }}</UiBadge>
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted">GitHub</dt>
            <dd>
              <UiBadge :tone="site?.methods.github ? 'success' : 'neutral'">
                {{
                  site?.methods.github
                    ? t('studio.settings.configured')
                    : t('studio.settings.notConfigured')
                }}
              </UiBadge>
            </dd>
          </div>
        </dl>
        <div class="panel-actions">
          <UiButton type="submit" variant="primary" :loading="pending === 'access'">{{
            t('common.save')
          }}</UiButton>
        </div>
      </form>

      <StudioMailSettings :initial="data[1]" @stale="stale = true" />
    </template>

    <template v-else-if="!loadError">
      <div v-for="i in 3" :key="i" class="h-48 animate-pulse rounded-md bg-surface-2" />
    </template>
  </div>
</template>
