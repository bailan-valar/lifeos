import { initRxDB } from '~/services/rxdb'

export default defineNuxtPlugin(async () => {
  let db: any = null
  try {
    db = await initRxDB()
  } catch (error) {
    console.error('Failed to initialize RxDB:', error)
  }
  return {
    provide: {
      rxdb: db
    }
  }
})
