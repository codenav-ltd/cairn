export default defineNuxtRouteMiddleware((to) => {
  const { me } = useSession()
  if (!me.value) {
    return navigateTo({ path: useLocalePath()('/sign-in'), query: { next: to.fullPath } })
  }
})
