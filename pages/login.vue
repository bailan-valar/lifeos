<script setup lang="ts">
import { startSync } from '~/services/sync'

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function handleLogin() {
  errorMessage.value = ''

  try {
    await authStore.login(email.value, password.value)
    await workspaceStore.reload()
    if (workspaceStore.list.length > 0 && !workspaceStore.currentId) {
      await workspaceStore.switchTo(workspaceStore.list[0].id)
    } else if (workspaceStore.currentId) {
      await startSync(workspaceStore.currentId)
    }
    await router.push('/')
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Login failed'
  }
}

onMounted(() => {
  if (authStore.user) {
    router.push('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
    <div class="glass-card w-full max-w-sm p-8 space-y-6">
      <div class="text-center space-y-2">
        <h1 class="title2 text-white">Welcome Back</h1>
        <p class="body text-white/60">Sign in to continue to LifeOS</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-2">
          <label class="subheadline text-white/80">Email</label>
          <input
            v-model="email"
            type="email"
            autocapitalize="none"
            autocomplete="email"
            class="ios-searchbar w-full"
            placeholder="your@email.com"
            required
          />
        </div>

        <div class="space-y-2">
          <label class="subheadline text-white/80">Password</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="ios-searchbar w-full"
            placeholder="••••••••"
            required
          />
        </div>

        <div
          v-if="errorMessage"
          class="bg-red-500/20 border border-red-500/40 rounded-xl p-3"
        >
          <p class="callout text-red-200">{{ errorMessage }}</p>
        </div>

        <button type="submit" class="ios-button-primary w-full headline" :disabled="authStore.isLoading">
          {{ authStore.isLoading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="text-center">
        <p class="footnote text-white/60">
          Don't have an account?
          <NuxtLink to="/signup" class="text-ios-blue">
            Sign up
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
