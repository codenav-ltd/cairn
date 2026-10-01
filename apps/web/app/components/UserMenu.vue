<script setup lang="ts">
import { LogOut, Settings, UserRound, Users } from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const { me, signOut } = useSession()
const allowed = useCan()
const toast = useToast()
const errorMessage = useErrorMessage()

async function onSignOut() {
  try {
    await signOut()
    await navigateTo(localePath('/'))
  } catch (e) {
    toast.error(t('nav.signOutFailed'), errorMessage(e))
  }
}
</script>

<template>
  <UiMenu v-if="me">
    <template #trigger>
      <button type="button" class="trigger" :aria-label="t('nav.menu')">
        <UiAvatar :name="me.name" :src="me.image" :size="28" />
      </button>
    </template>
    <div class="px-3 py-2">
      <p class="truncate font-semibold">{{ me.name }}</p>
      <p class="truncate font-mono text-meta text-muted">{{ me.email }}</p>
    </div>
    <UiMenuSeparator />
    <UiMenuItem as-child>
      <NuxtLink :to="localePath('/account')"
        ><UserRound :size="16" aria-hidden="true" />{{ t('nav.account') }}</NuxtLink
      >
    </UiMenuItem>
    <UiMenuItem v-if="allowed('settings.manage')" as-child>
      <NuxtLink :to="localePath('/studio/settings')"
        ><Settings :size="16" aria-hidden="true" />{{ t('nav.settings') }}</NuxtLink
      >
    </UiMenuItem>
    <UiMenuItem v-if="allowed('members.view')" as-child>
      <NuxtLink :to="localePath('/studio/members')"
        ><Users :size="16" aria-hidden="true" />{{ t('nav.members') }}</NuxtLink
      >
    </UiMenuItem>
    <UiMenuSeparator />
    <UiMenuItem @select="onSignOut"
      ><LogOut :size="16" aria-hidden="true" />{{ t('nav.signOut') }}</UiMenuItem
    >
  </UiMenu>
</template>

<style scoped>
.trigger {
  display: inline-flex;
  padding: 2px;
  border: 0;
  border-radius: var(--r-full);
  background: transparent;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}

.trigger:hover {
  background: var(--hover);
}

.trigger:active {
  transform: scale(0.95);
}
</style>
