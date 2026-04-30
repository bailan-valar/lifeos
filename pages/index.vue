<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()

const isLoading = ref(true)
const scenes = ref<any[]>([])

async function fetchScenes() {
  try {
    const response = await $fetch('/api/scenes', {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })
    scenes.value = response as any[]
  } catch (error) {
    console.error('Failed to fetch scenes:', error)
  } finally {
    isLoading.value = false
  }
}

function navigateToScene(sceneId: string) {
  router.push(`/scenes/${sceneId}`)
}

onMounted(async () => {
  if (!authStore.user) {
    router.push('/login')
    return
  }

  await fetchScenes()
})
</script>

<template>
  <div class="min-h-screen">
    <nav class="ios-navbar fixed top-0 left-0 right-0 z-50">
      <div class="flex items-center justify-between px-4 py-3">
        <h1 class="title3 text-white">LifeOS</h1>
        <button
          @click="authStore.logout(); router.push('/login')"
          class="ios-button-secondary caption1 px-4 py-2"
        >
          Sign Out
        </button>
      </div>
    </nav>

    <main class="pt-24 px-4 pb-8 safe-top">
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="title2 text-white">My Scenes</h2>
          <button class="ios-fab">
            <Icon name="solar:add-circle-linear" class="w-8 h-8 text-white" />
          </button>
        </div>

        <div v-if="isLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="glass-card shimmer h-24 rounded-3xl" />
        </div>

        <div v-else-if="scenes.length === 0" class="text-center py-12">
          <p class="body text-white/60">No scenes yet. Create your first scene!</p>
        </div>

        <div v-else class="space-y-3">
          <button
            v-for="scene in scenes"
            :key="scene.id"
            @click="navigateToScene(scene.id)"
            class="glass-card w-full p-4 text-left active:scale-[0.98] transition-transform duration-150"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Icon :name="scene.icon || 'solar:document-linear'" class="w-6 h-6 text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="headline text-white truncate">{{ scene.name }}</h3>
                <p v-if="scene.description" class="footnote text-white/60 truncate">{{ scene.description }}</p>
              </div>
              <Icon name="solar:alt-arrow-right-linear" class="w-5 h-5 text-white/40" />
            </div>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
