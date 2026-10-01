import { serve } from '@hono/node-server'
import { createDb, runMigrations } from '@cairnhq/db'
import { createApp } from './app'
import { runCli } from './cli'
import { loadConfig } from './config'
import { createServices } from './services'
import { startBoss, startWorker } from './worker'

const [command, ...args] = process.argv.slice(2)
const config = loadConfig()
const { db, pool } = createDb(config.databaseUrl)

if (command === 'migrate') {
  await runMigrations(pool)
  console.log('[migrate] done')
  await pool.end()
  process.exit(0)
}

if (config.autoMigrate) {
  await runMigrations(pool)
}

const boss = await startBoss(config)

if (command !== undefined) {
  const code = await runCli(command, args, { config, db, boss })
  await boss.stop({ graceful: true })
  await pool.end()
  process.exit(code)
}

const services = createServices({ config, db, boss })
const stops: Array<() => Promise<void>> = [() => boss.stop({ graceful: true })]

if (config.roles.has('api')) {
  const app = createApp({ config, db, services })
  const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
    console.log(`[api] listening on ${port} (${config.env}, ${config.version})`)
  })
  stops.unshift(
    () => new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  )
}

if (config.roles.has('worker')) {
  await startWorker(boss, services)
}

let stopping = false
async function shutdown(signal: string) {
  if (stopping) return
  stopping = true
  console.log(`[main] ${signal}, shutting down`)
  for (const stop of stops) await stop().catch((error) => console.error('[main]', error))
  await pool.end()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
