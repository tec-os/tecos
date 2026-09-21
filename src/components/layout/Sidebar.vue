<script setup>
import { inject, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { X } from '@lucide/vue'
import { cn } from '../../utils/cn'
import { useAuthStore } from '@/stores/auth'
import Button from '../ui/Button.vue'
import SidebarItem from './SidebarItem.vue'

// Injeta dependências
const isMobileOpen = inject('isMobileOpen')
const toggleMobile = inject('toggleMobile')
const navigation = inject('navigation')
const route = useRoute()

const authStore = useAuthStore()
const isSuperadmin = computed(() => authStore.userProfile?.is_superadmin === true)

// Fecha a sidebar no mobile automaticamente ao trocar de página
watch(
  () => route.path,
  () => {
    if (isMobileOpen.value) {
      toggleMobile()
    }
  },
)
</script>

<template>
  <aside
    :class="
      cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background transition-transform duration-300 md:static md:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
      )
    "
  >
    <!-- Header -->
    <div class="flex h-16 items-center justify-between border-b border-border px-4">
      <div class="flex items-center gap-3">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
          >T</span
        >
        <div>
          <span class="block font-bold leading-none text-foreground"
            >Tec<span class="text-destructive">OS</span></span
          >
          <span
            class="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >{{ isSuperadmin ? 'Admin Global' : 'Operação' }}</span
          >
        </div>
      </div>
      <Button variant="ghost" size="icon" class="md:hidden" @click="toggleMobile">
        <X class="h-5 w-5" />
      </Button>
    </div>

    <!-- Links -->
    <nav class="flex-1 overflow-y-auto p-4">
      <ul class="space-y-1">
        <SidebarItem v-for="item in navigation" :key="item.title" :item="item" />
      </ul>
    </nav>
  </aside>
</template>
