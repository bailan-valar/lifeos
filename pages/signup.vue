<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function handleSignup() {
  errorMessage.value = ''

  try {
    await authStore.signup(email.value, password.value, name.value || undefined)
    await router.push('/')
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Signup failed'
  }
}

onMounted(() => {
  if (authStore.user) {
    router.push('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
    <div class="glass-card w-full max-w-sm p-8 space-y-6">
      <div class="text-center space-y-2">
        <h1 class="title2 text-white">Create Account</h1>
        <p class="body text-white/60">Get started with LifeOS today</p>
      </div>

      <form @submit.prevent="handleSignup" class="space-y-4">
        <div class="space-y-2">
          <label class="subheadline text-white/80">Name</label>
          <input
            v-model="name"
            type="text"
            autocapitalize="words"
            autocomplete="name"
            class="ios-searchbar w-full"
            placeholder="Your name"
          />
        </div>

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
            autocomplete="new-password"
            class="ios-searchbar w-full"
            placeholder="••••••••"
            minlength="8"
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
          {{ authStore.isLoading ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>

      <div class="text-center">
        <p class="footnote text-white/60">
          Already have an account?
          <NuxtLink to="/login" class="text-ios-blue">
            Sign in
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
