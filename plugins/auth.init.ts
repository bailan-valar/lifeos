export default defineNuxtPlugin({
  name: 'auth-init',
  async setup() {
    const authStore = useAuthStore()
    await authStore.initialize()
  }
})
