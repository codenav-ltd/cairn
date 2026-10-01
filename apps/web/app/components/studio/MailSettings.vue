<script setup lang="ts">
import { mailDrivers, type MailDriverName, type MailSettingsView } from '@cairnhq/contracts'

const props = defineProps<{ initial: MailSettingsView }>()
const emit = defineEmits<{ stale: [] }>()

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const { site } = useSession()
const { pending, error, run } = useAction()

type Value = string | number | boolean
const view = ref(props.initial)
const driver = ref<MailDriverName>(view.value.driver)
const values = ref<Record<string, Value>>({ ...view.value.values })
const confirmReset = ref(false)

const fields = computed(() => mailDrivers[driver.value])
const drivers = computed(() =>
  (['none', 'log', 'smtp', 'aliyun-dm'] as const).map((d) => ({
    value: d,
    label: t(`studio.mail.drivers.${d}.label`),
    description: t(`studio.mail.drivers.${d}.description`),
  })),
)

watch(driver, (d) => {
  if (d === view.value.driver) values.value = { ...view.value.values }
  else values.value = d === 'smtp' ? { port: 465, secure: true } : {}
})

function payload() {
  const out: Record<string, Value> = {}
  for (const f of fields.value) {
    const v = values.value[f.key]
    if (v === undefined || v === '') continue
    out[f.key] = f.kind === 'number' ? Number(v) : v
  }
  return { driver: driver.value, values: out }
}

function settled(next: MailSettingsView) {
  view.value = next
  driver.value = next.driver
  values.value = { ...next.values }
  if (site.value) site.value = { ...site.value, mail: next.driver !== 'none' }
}

async function save() {
  const result = await run('save', () =>
    api<MailSettingsView>('/api/settings/mail', { method: 'PUT', body: payload() }),
  )
  if (result.ok) {
    settled(result.value)
    toast.success(t('studio.mail.saved'))
  } else if (result.code === 'session_not_fresh') emit('stale')
}

async function sendTest() {
  const result = await run('test', () =>
    api<{ sentTo: string }>('/api/settings/mail/test', { method: 'POST' }),
  )
  if (result.ok) toast.success(t('studio.mail.testSent', { email: result.value.sentTo }))
}

async function reset() {
  const result = await run('reset', () =>
    api<MailSettingsView>('/api/settings/mail', { method: 'DELETE' }),
  )
  confirmReset.value = false
  if (result.ok) {
    settled(result.value)
    toast.success(t('studio.mail.resetDone'))
  } else if (result.code === 'session_not_fresh') emit('stale')
}

function set(key: string, value: Value | undefined) {
  values.value[key] = value ?? ''
}

function text(key: string) {
  const v = values.value[key]
  return typeof v === 'boolean' ? undefined : v
}

// Only secrets saved here are kept; the server environment's are never copied.
function secretKept(key: string) {
  return (
    view.value.source === 'settings' &&
    view.value.driver === driver.value &&
    Boolean(view.value.secrets[key])
  )
}
</script>

<template>
  <form class="panel" @submit.prevent="save">
    <div class="flex items-start justify-between gap-4">
      <h2 class="panel-title">{{ t('studio.mail.title') }}</h2>
      <UiBadge :tone="view.source === 'settings' ? 'cobalt' : 'neutral'">
        {{
          view.source === 'settings' ? t('studio.mail.sourceSettings') : t('studio.mail.sourceEnv')
        }}
      </UiBadge>
    </div>
    <p class="panel-lead">{{ t('studio.mail.lead') }}</p>

    <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
    <UiNotice
      v-if="view.allowedRecipients.length"
      tone="amber"
      :title="t('studio.mail.allowListTitle')"
    >
      {{ t('studio.mail.allowListBody', { list: view.allowedRecipients.join(', ') }) }}
    </UiNotice>

    <UiField :label="t('studio.mail.driver')">
      <UiSelect v-model="driver" :options="drivers" />
    </UiField>

    <template v-for="f in fields" :key="`${driver}:${f.key}`">
      <UiSwitch
        v-if="f.kind === 'boolean'"
        :model-value="Boolean(values[f.key])"
        :label="t(`studio.mail.fields.${f.key}.label`)"
        :description="t(`studio.mail.fields.${f.key}.hint`)"
        @update:model-value="(v) => set(f.key, v)"
      />
      <UiField
        v-else
        :label="t(`studio.mail.fields.${f.key}.label`)"
        :hint="
          f.kind === 'secret'
            ? secretKept(f.key)
              ? t('studio.mail.secretKeptHint')
              : t('studio.mail.secretHint')
            : t(`studio.mail.fields.${f.key}.hint`)
        "
        :optional="f.optional ? t('common.optional') : undefined"
      >
        <PasswordInput
          v-if="f.kind === 'secret'"
          :model-value="String(values[f.key] ?? '')"
          :placeholder="secretKept(f.key) ? t('studio.mail.secretKept') : ''"
          :required="!f.optional && !secretKept(f.key)"
          autocomplete="off"
          @update:model-value="(v) => set(f.key, v)"
        />
        <UiInput
          v-else
          :model-value="text(f.key)"
          :type="f.kind === 'number' ? 'number' : f.kind === 'email' ? 'email' : 'text'"
          :required="!f.optional"
          autocomplete="off"
          spellcheck="false"
          @update:model-value="(v) => set(f.key, v)"
        />
      </UiField>
    </template>

    <div class="panel-actions">
      <UiButton v-if="view.source === 'settings'" variant="ghost" @click="confirmReset = true">
        {{ t('studio.mail.reset') }}
      </UiButton>
      <UiButton
        :loading="pending === 'test'"
        :disabled="Boolean(pending) || view.driver === 'none'"
        @click="sendTest"
      >
        {{ t('studio.mail.test') }}
      </UiButton>
      <UiButton
        type="submit"
        variant="primary"
        :loading="pending === 'save'"
        :disabled="Boolean(pending)"
      >
        {{ t('studio.mail.save') }}
      </UiButton>
    </div>

    <UiDialog
      v-model:open="confirmReset"
      :title="t('studio.mail.resetTitle')"
      :description="t('studio.mail.resetBody')"
      :close-label="t('common.close')"
    >
      <template #footer>
        <UiButton @click="confirmReset = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="danger" :loading="pending === 'reset'" @click="reset">{{
          t('studio.mail.reset')
        }}</UiButton>
      </template>
    </UiDialog>
  </form>
</template>
