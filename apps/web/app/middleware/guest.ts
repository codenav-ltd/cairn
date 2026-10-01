export default defineNuxtRouteMiddleware((to) => {
  const { me } = useSession()
  if (me.value) return navigateTo(safeNext(to.query.next) ?? useLocalePath()('/'))
})
