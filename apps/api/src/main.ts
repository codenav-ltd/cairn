import { serve } from '@hono/node-server'
import { createDb, runMigrations } from '@cairnhq/db'
import { createApp } from './app'
import { loadConfig } from './config'
import { startWorker } from './worker'

const command = process.argv[2]
const config = loadConfig()
const { db, pool } = createDb(config.databaseUrl)

if (command === 'migrate') {
  await runMigrations(pool)
  console.log('[migrate] done')
  await pool.end()
  process.exit(0)
}

if (command !== undefined) {
  console.error(`Unknown command: ${command}`)
  process.exit(1)
}

if (config.autoMigrate) {
  await runMigrations(pool)
}

const stops: Array<() => Promise<void>> = []

if (config.roles.has('api')) {
  const app = createApp({ config, db })
  const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
    console.log(`[api] listening on ${port} (${config.env}, ${config.version})`)
  })
  stops.push(
    () => new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  )
}

if (config.roles.has('worker')) {
  stops.push(await startWorker(config))
}

let stopping = false
async function shutdown(signal: string) {
  if (stopping) return
  stopping = true
  console.log(`[main] ${signal}, shutting down`)
  await Promise.allSettled(stops.map((stop) => stop()))
  await pool.end()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
