<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { buscarAssinaturaDaEmpresa } from '../../services/contaService'
import { supabase } from '@/services/supabase'

import PublicAuthShell from '@/components/common/PublicAuthShell.vue'
import Button from '@/components/ui/Button.vue'
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  LogOut,
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)
const erro = ref('')
const status = ref('aguardando')
let intervalo

const linkPagamento = ref(route.query.link || '')
const statusLabel = computed(
  () =>
    ({
      aguardando: 'Aguardando pagamento',
      ativa: 'Conta liberada',
      vencida: 'Pagamento pendente',
      pendente: 'Pagamento pendente',
    })[status.value] || 'Aguardando pagamento',
)

async function verificarStatus() {
  loading.value = true
  erro.value = ''
  try {
    const assinatura = await buscarAssinaturaDaEmpresa(authStore.empresaId)
    status.value = assinatura.status

    // Se o link estava vazio (porque acessou direto a URL), tenta pegar do banco
    if (!linkPagamento.value && assinatura.url_pagamento) {
      linkPagamento.value = assinatura.url_pagamento
    }

    if (assinatura.status === 'ativa') router.push('/dashboard')
  } catch (error) {
    erro.value = 'Não foi possível consultar o status agora.'
  } finally {
    loading.value = false
  }
}

async function handleSair() {
  await supabase.auth.signOut()
  authStore.user = null // Garante que o router saiba que deslogou imediatamente
  router.push('/login')
}

onMounted(async () => {
  await authStore.carregarSessao()
  if (!authStore.user) {
    router.push('/login')
    return
  }
  await verificarStatus()
  intervalo = setInterval(verificarStatus, 10000)
})

onUnmounted(() => clearInterval(intervalo))
</script>

<template>
  <PublicAuthShell
    eyebrow="Ative seu ambiente"
    title="Só falta confirmar sua assinatura"
    description="A conta já foi criada. Conclua o pagamento para liberar o acesso ao painel da sua empresa."
  >
    <div class="space-y-5">
      <div class="flex items-start gap-3 rounded-lg border border-[#c8d9ce] bg-[#eef3ee] p-4">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d6f36b] text-primary"
          ><CheckCircle2 class="h-5 w-5"
        /></span>
        <div>
          <p class="font-semibold text-primary">Ambiente reservado</p>
          <p class="mt-1 text-sm leading-5 text-[#52625c]">
            Seus dados estão guardados. O pagamento apenas libera o acesso.
          </p>
        </div>
      </div>
      <a
        v-if="linkPagamento"
        :href="linkPagamento"
        target="_blank"
        rel="noopener noreferrer"
        class="flex h-12 w-full items-center justify-between rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[#26564d]"
        ><span>Continuar para pagamento</span><ExternalLink class="h-4 w-4"
      /></a>
      <div
        v-else
        class="rounded-lg border border-[#e4c1b3] bg-[#fff8f4] p-3 text-sm text-[#a95639]"
      >
        O link de pagamento não foi encontrado. Faça login novamente para consultar sua assinatura.
      </div>
      <div class="rounded-lg border border-border bg-surface p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock3 class="h-4 w-4 text-[#a56f31]" />Status da conta
          </div>
          <span
            class="rounded-full bg-[#fff0e9] px-2.5 py-1 text-xs font-semibold text-[#a95639]"
            >{{ statusLabel }}</span
          >
        </div>
        <p class="mt-3 text-xs leading-5 text-muted-foreground">
          Depois de pagar, clique em atualizar. A confirmação também é verificada automaticamente.
        </p>
      </div>
      <div
        v-if="erro"
        class="flex items-center gap-2 rounded-lg border border-[#e4c1b3] bg-[#fff8f4] p-3 text-sm text-[#a95639]"
      >
        <ShieldCheck class="h-4 w-4 shrink-0" />{{ erro }}
      </div>
      <Button
        variant="outline"
        class="h-11 w-full justify-between"
        :disabled="loading"
        @click="verificarStatus"
        ><span>{{ loading ? 'Consultando...' : 'Já paguei, atualizar acesso' }}</span
        ><Loader2 v-if="loading" class="h-4 w-4 animate-spin" /><RefreshCw v-else class="h-4 w-4"
      /></Button>
    </div>
    <p class="mt-7 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">
      O acesso é liberado automaticamente após a confirmação do pagamento.
    </p>

    <div class="mt-8 flex justify-center">
      <button
        @click="handleSair"
        class="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
      >
        <LogOut class="w-4 h-4" /> Sair ou entrar com outra conta
      </button>
    </div>
  </PublicAuthShell>
</template>
