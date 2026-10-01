import { PgBoss } from 'pg-boss'
import type { Config } from './config'

export async function startWorker(config: Config) {
  const boss = new PgBoss(config.databaseUrl)
  boss.on('error', (error) => console.error('[worker]', error))
  await boss.start()
  console.log('[worker] started')

  return async () => {
    await boss.stop({ graceful: true })
  }
}
