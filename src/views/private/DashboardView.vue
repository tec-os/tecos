<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { carregarResumoDashboard } from '@/services/dashboardService'
import { toast } from '@/composables/useToast'

import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Plus,
  RefreshCw,
  Users,
  Wrench,
  Bell,
  AlertCircle,
  CheckCircle,
  DatabaseBackup,
} from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const erro = ref('')
const resumo = ref({
  totalClientes: 0,
  osEmAndamento: 0,
  faturamentoTotal: 0,
  ticketMedio: 0,
  minhasOsEmAndamento: 0,
  filaAtencao: [],
  lembretes: [],
})

const isGerente = computed(() => ['gerente', 'dono'].includes(authStore.userProfile?.perfil))

async function carregarDashboard() {
  if (!authStore.empresaId || !authStore.user?.id) return
  loading.value = true
  erro.value = ''
  try {
    resumo.value = await carregarResumoDashboard(
      authStore.empresaId,
      authStore.user.id,
      authStore.userProfile?.perfil,
    )
  } catch (error) {
    erro.value = 'Não foi possível carregar o resumo da operação.'
    toast.error('Dashboard indisponível', erro.value)
  } finally {
    loading.value = false
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

function formatarData(valor) {
  return valor ? new Date(valor).toLocaleDateString('pt-BR') : '-'
}

function statusInfo(status) {
  const mapa = {
    aberta: { label: 'Aberta', variant: 'destructive' },
    em_andamento: { label: 'Em andamento', variant: 'default' },
    aguardando_peca: { label: 'Aguardando peça', variant: 'outline' },
    concluida: { label: 'Concluída', variant: 'success' },
    cancelada: { label: 'Cancelada', variant: 'destructive' },
  }
  return mapa[status] || { label: status || 'Sem status', variant: 'outline' }
}

watch(() => authStore.empresaId, carregarDashboard, { immediate: true })

const precisaBackup = computed(() => {
  if (!isGerente.value) return false
  const ultimo = authStore.userProfile?.empresas?.ultimo_backup
  if (!ultimo) return true // Nunca fez

  // Verifica se passou mais de 30 dias
  const dataUltimo = new Date(ultimo)
  const dataHoje = new Date()
  const diffTime = Math.abs(dataHoje - dataUltimo)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays >= 30
})
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      eyebrow="Painel da operação"
      :title="`Bom trabalho, ${authStore.userProfile?.nome?.split(' ')[0] || 'equipe'}`"
      description="Aqui está o que precisa da sua atenção hoje."
      tip="Comece pelas ordens que precisam de atenção e use a agenda para organizar os próximos atendimentos da equipe."
    >
      <template #actions>
        <Button
          variant="outline"
          size="icon"
          title="Atualizar resumo"
          :disabled="loading"
          @click="carregarDashboard"
        >
          <RefreshCw class="h-4 w-4" :class="loading && 'animate-spin'" />
        </Button>
        <Button class="gap-2" @click="router.push('/ordens-servico/nova')">
          <Plus class="h-4 w-4" />
          Nova OS
        </Button>
      </template>
    </PageHeader>

    <!-- Banner de Backup Atrasado (Apenas Gerentes) -->
    <div
      v-if="precisaBackup"
      class="flex flex-col gap-3 rounded-lg border border-[#e4c1b3] bg-[#fff8f4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <DatabaseBackup class="h-5 w-5 text-[#a95639] shrink-0" />
        <div class="text-sm text-[#a95639]">
          <span class="font-semibold block sm:inline">Aviso de Segurança:</span>
          O último backup da sua loja foi feito há mais de 30 dias (ou nunca foi feito).
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        class="border-[#a95639]/30 text-[#a95639] hover:bg-[#a95639] hover:text-white shrink-0"
        @click="router.push('/configuracoes')"
      >
        Fazer Backup Agora
      </Button>
    </div>

    <div
      v-if="erro"
      class="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-[#fff8f4] px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{{ erro }}</span>
      <Button variant="outline" size="sm" @click="carregarDashboard">Tentar novamente</Button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="card in isGerente
          ? [
              {
                label: 'OS ativas na loja',
                value: resumo.osEmAndamento,
                icon: Wrench,
                tone: 'bg-[#fff0e9] text-destructive',
              },
              {
                label: 'Clientes ativos',
                value: resumo.totalClientes,
                icon: Users,
                tone: 'bg-[#e8f3e4] text-success',
              },
              {
                label: 'Faturamento total',
                value: formatarMoeda(resumo.faturamentoTotal),
                icon: ClipboardList,
                tone: 'bg-[#e7eef5] text-[#43627a]',
              },
              {
                label: 'Ticket médio',
                value: formatarMoeda(resumo.ticketMedio),
                icon: CheckCircle2,
                tone: 'bg-[#f0eddf] text-[#87733e]',
              },
            ]
          : [
              {
                label: 'Minhas pendências (OS)',
                value: resumo.minhasOsEmAndamento,
                icon: Wrench,
                tone: 'bg-[#fff0e9] text-destructive',
              },
              {
                label: 'Meus lembretes ativos',
                value: resumo.lembretes.length,
                icon: Bell,
                tone: 'bg-[#f0eddf] text-[#87733e]',
              },
              {
                label: 'Lembretes não lidos',
                value: authStore.lembretesNaoLidos || 0,
                icon: AlertCircle,
                tone: 'bg-[#e8f3e4] text-success',
              },
              {
                label: 'OS globais',
                value: resumo.osEmAndamento,
                icon: ClipboardList,
                tone: 'bg-[#e7eef5] text-[#43627a]',
              },
            ]"
        :key="card.label"
        class="border-border shadow-none"
      >
        <CardContent class="flex items-start justify-between p-5">
          <div>
            <p class="text-sm text-muted-foreground">{{ card.label }}</p>
            <Skeleton v-if="loading" class="mt-3 h-8 w-28" />
            <p v-else class="mt-2 text-2xl font-bold tracking-tight text-primary">
              {{ card.value }}
            </p>
          </div>
          <span :class="['flex h-10 w-10 items-center justify-center rounded-lg', card.tone]"
            ><component :is="card.icon" class="h-5 w-5"
          /></span>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <!-- Coluna Principal: Fila de Atenção -->
      <Card class="border-border shadow-none">
        <CardContent class="p-0">
          <div class="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 class="font-semibold text-primary">
                {{ isGerente ? 'Fila de atenção da loja' : 'Sua fila de atenção' }}
              </h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Ordens em andamento, aguardando aprovação ou peça.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="gap-1 text-primary"
              @click="router.push('/ordens-servico')"
              >Ver todas <ArrowRight class="h-4 w-4"
            /></Button>
          </div>
          <div v-if="loading" class="space-y-4 p-5">
            <Skeleton v-for="item in 4" :key="item" class="h-12 w-full" />
          </div>
          <EmptyState
            v-else-if="!resumo.filaAtencao.length"
            title="Sua fila está limpa"
            description="Você não possui pendências ativas no momento."
            action-label="Abrir nova OS"
            @action="router.push('/ordens-servico/nova')"
          />
          <div v-else class="divide-y divide-border">
            <button
              v-for="os in resumo.filaAtencao"
              :key="os.id"
              class="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-muted"
              @click="router.push(`/ordens-servico/${os.id}`)"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-bold text-primary"
                >#{{ os.numero_os }}</span
              >
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium text-foreground">{{
                  os.clientes?.nome || 'Cliente não encontrado'
                }}</span>
                <span class="mt-1 block text-xs text-muted-foreground truncate"
                  >{{ formatarMoeda(os.valor_total) }} · Criada em
                  {{ formatarData(os.created_at) }}</span
                >
              </span>
              <Badge
                class="hidden sm:inline-flex whitespace-nowrap"
                :variant="statusInfo(os.status).variant"
                >{{ statusInfo(os.status).label }}</Badge
              >
              <ArrowRight class="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </CardContent>
      </Card>

      <!-- Coluna Lateral: Lembretes e Agenda -->
      <div class="space-y-6 flex flex-col">
        <!-- Lembretes Urgentes -->
        <Card class="border-orange-200 bg-orange-50/50 shadow-none flex-1">
          <CardContent class="p-0 flex flex-col h-full">
            <div class="flex items-center justify-between border-b border-orange-200/50 px-5 py-4">
              <div>
                <h2 class="font-semibold text-orange-900 flex items-center gap-2">
                  <Bell class="h-4 w-4" /> Lembretes Urgentes
                </h2>
              </div>
            </div>
            <div class="p-5 flex-1">
              <div v-if="loading" class="space-y-3">
                <Skeleton v-for="item in 2" :key="item" class="h-16 w-full" />
              </div>
              <div
                v-else-if="!resumo.lembretes.length"
                class="text-sm text-orange-800/70 text-center py-6"
              >
                Você não tem lembretes atrasados ou para hoje.
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="lembrete in resumo.lembretes"
                  :key="lembrete.id"
                  class="rounded-md bg-white border border-orange-200 p-3 shadow-sm hover:shadow-md cursor-pointer transition-all"
                  @click="
                    lembrete.referencia_id
                      ? router.push(`/ordens-servico/${lembrete.referencia_id}`)
                      : null
                  "
                >
                  <div class="flex justify-between items-start gap-2">
                    <p class="text-sm font-medium text-orange-950">{{ lembrete.mensagem }}</p>
                  </div>
                  <div class="mt-2 text-xs text-orange-700/80 font-medium">
                    Para: {{ formatarData(lembrete.data_alvo) }}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Organizar o dia -->
        <Card class="border-primary bg-primary text-primary-foreground shadow-none shrink-0">
          <CardContent class="flex flex-col justify-between p-6">
            <div>
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <CalendarDays class="h-5 w-5 text-[#d6f36b]" />
              </div>
              <h2 class="mt-5 text-xl font-semibold">Organize o dia</h2>
              <p class="mt-2 text-sm leading-6 text-[#c5d8cf]">
                Veja os atendimentos agendados e mantenha cada técnico no ritmo certo.
              </p>
            </div>
            <Button
              variant="secondary"
              class="mt-8 w-full justify-between bg-[#d6f36b] text-primary hover:bg-[#e2fa89]"
              @click="router.push('/agenda')"
              >Abrir agenda <ArrowRight class="h-4 w-4"
            /></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
