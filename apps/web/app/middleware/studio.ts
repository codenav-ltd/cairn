export default defineNuxtRouteMiddleware((to) => {
  const { me } = useSession()
  if (!me.value) {
    return navigateTo({ path: useLocalePath()('/sign-in'), query: { next: to.fullPath } })
  }
  const allowed = useCan()
  if (!allowed('settings.manage') && !allowed('members.view')) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Forbidden' }))
  }
})
