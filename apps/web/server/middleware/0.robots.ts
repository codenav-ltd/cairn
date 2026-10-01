export default defineEventHandler((event) => {
  if (serverEnv().env === 'staging') {
    setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  }
})
