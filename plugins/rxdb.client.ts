import { initRxDB } from '~/services/rxdb'

export default defineNuxtPlugin(async () => {
  try {
    const db = await initRxDB()
    return {
      provide: {
        rxdb: db
      }
    }
  } catch (error) {
    console.error('Failed to initialize RxDB:', error)
  }
})
