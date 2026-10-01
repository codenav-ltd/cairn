<script setup lang="ts">
import type { Locale, Me } from '@cairnhq/contracts'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const { me } = useSession()
const { pending, error, run } = useAction()

const name = ref(me.value?.name ?? '')
const language = ref<Locale | 'site'>(me.value?.locale ?? 'site')

const languages = computed(() => [
  { value: 'site' as const, label: t('account.profile.siteLanguage') },
  { value: 'en' as const, label: 'English' },
  { value: 'zh-CN' as const, label: '中文' },
])

const dirty = computed(
  () =>
    name.value.trim() !== me.value?.name ||
    (language.value === 'site' ? null : language.value) !== me.value?.locale,
)

async function save() {
  const result = await run('save', () =>
    api<Me>('/api/me', {
      method: 'PATCH',
      body: { name: name.value.trim(), locale: language.value === 'site' ? null : language.value },
    }),
  )
  if (result.ok) {
    me.value = result.value
    toast.success(t('account.profile.saved'))
  }
}
</script>

<template>
  <form class="panel" @submit.prevent="save">
    <h2 class="panel-title">{{ t('account.profile.title') }}</h2>
    <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
    <UiField :label="t('common.name')" :hint="t('auth.signUp.nameHint')">
      <UiInput v-model="name" autocomplete="name" maxlength="80" required />
    </UiField>
    <UiField :label="t('account.profile.email')">
      <div class="flex items-center gap-2">
        <span class="font-mono text-meta">{{ me?.email }}</span>
        <UiBadge :tone="me?.emailVerified ? 'success' : 'amber'">
          {{ me?.emailVerified ? t('account.profile.verified') : t('account.profile.unverified') }}
        </UiBadge>
      </div>
    </UiField>
    <UiField :label="t('account.profile.language')" :hint="t('account.profile.languageHint')">
      <UiSelect v-model="language" :options="languages" />
    </UiField>
    <div class="panel-actions">
      <UiButton type="submit" variant="primary" :loading="pending === 'save'" :disabled="!dirty">
        {{ t('account.profile.save') }}
      </UiButton>
    </div>
  </form>
</template>
