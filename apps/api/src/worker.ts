import { PgBoss } from 'pg-boss'
import type { Config } from './config'
import { createMailQueue, startMailWorker } from './modules/mail/service'
import type { Services } from './services'

/** Every role needs a started pg-boss: the api enqueues, the worker consumes. */
export async function startBoss(config: Config) {
  const boss = new PgBoss(config.databaseUrl)
  boss.on('error', (error) => console.error('[boss]', error))
  await boss.start()
  await createMailQueue(boss)
  return boss
}

export async function startWorker(boss: PgBoss, services: Services) {
  await startMailWorker(boss, services.mail)
  console.log('[worker] started')
}
