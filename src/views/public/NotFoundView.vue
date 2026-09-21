<script setup>
import { useRouter } from 'vue-router'
import { Compass, ArrowLeft } from '@lucide/vue'
import Button from '@/components/ui/Button.vue'

const router = useRouter()

function voltar() {
  // Tenta voltar na história, se não der, vai pro dashboard
  if (window.history.length > 2) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-[#f7f9f8] flex flex-col items-center justify-center p-4 selection:bg-primary/20"
  >
    <div class="max-w-md w-full text-center space-y-8">
      <!-- Ilustração / Ícone -->
      <div class="relative flex justify-center">
        <div
          class="absolute inset-0 bg-[#eef3ee] blur-3xl rounded-full w-48 h-48 mx-auto opacity-70"
        ></div>
        <div
          class="relative bg-white shadow-sm border border-[#e4ebe7] w-24 h-24 rounded-3xl flex items-center justify-center transform rotate-3"
        >
          <Compass class="w-12 h-12 text-primary opacity-80" />
        </div>
      </div>

      <!-- Textos -->
      <div class="space-y-3 relative z-10">
        <h1 class="text-7xl font-bold tracking-tight text-primary">404</h1>
        <h2 class="text-2xl font-semibold text-[#1f2924]">Página não encontrada</h2>
        <p class="text-muted-foreground leading-relaxed">
          Parece que você explorou longe demais. A página que você está procurando não existe, foi
          movida ou você não tem acesso a ela.
        </p>
      </div>

      <!-- Ações -->
      <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          @click="voltar"
          class="h-12 px-6 w-full sm:w-auto bg-primary hover:bg-[#26564d] text-primary-foreground font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <ArrowLeft class="w-4 h-4" />
          Voltar para o início
        </Button>
      </div>
    </div>

    <!-- Logo discreta no rodapé -->
    <div
      class="absolute bottom-8 left-0 right-0 flex justify-center opacity-40 hover:opacity-100 transition-opacity"
    >
      <div class="flex items-center gap-2 grayscale cursor-pointer" @click="router.push('/')">
        <div
          class="flex h-6 w-6 items-center justify-center rounded bg-[#1f2924] font-bold text-white text-xs"
        >
          T
        </div>
        <span class="text-sm font-bold tracking-tight text-[#1f2924]"
          >Tec<span class="text-primary">OS</span></span
        >
      </div>
    </div>
  </div>
</template>
