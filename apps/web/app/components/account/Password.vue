<script setup lang="ts">
const props = defineProps<{ hasPassword: boolean | null }>()

const { t } = useI18n()
const toast = useToast()
const { pending, error, run } = useAction()

const current = ref('')
const next = ref('')
const signOutOthers = ref(true)

async function change() {
  const result = await run('change', () =>
    authClient().changePassword({
      currentPassword: current.value,
      newPassword: next.value,
      revokeOtherSessions: signOutOthers.value,
    }),
  )
  if (result.ok) {
    current.value = ''
    next.value = ''
    toast.success(t('account.password.changed'))
  }
}
</script>

<template>
  <section class="panel">
    <h2 class="panel-title">{{ t('account.password.title') }}</h2>
    <div v-if="props.hasPassword === null" class="h-24 animate-pulse rounded-md bg-surface-2" />
    <p v-else-if="!props.hasPassword" class="text-muted">{{ t('account.password.none') }}</p>
    <form v-else class="grid gap-4" @submit.prevent="change">
      <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
      <UiField :label="t('account.password.current')">
        <PasswordInput v-model="current" autocomplete="current-password" required />
      </UiField>
      <UiField :label="t('account.password.next')" :hint="t('auth.passwordHint')">
        <PasswordInput
          v-model="next"
          autocomplete="new-password"
          minlength="10"
          maxlength="128"
          required
        />
      </UiField>
      <UiSwitch v-model="signOutOthers" :label="t('account.password.signOutOthers')" />
      <div class="panel-actions">
        <UiButton type="submit" variant="primary" :loading="pending === 'change'">
          {{ t('account.password.change') }}
        </UiButton>
      </div>
    </form>
  </section>
</template>
