export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return serverEnv().env === 'staging'
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\n'
})
