export default defineNuxtPlugin(async () => {
  const session = useSession()
  if (!session.loaded.value) await session.refresh()
})
