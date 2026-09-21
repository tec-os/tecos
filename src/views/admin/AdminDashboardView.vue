<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { carregarDashboardAdmin, alternarStatusEmpresa } from '@/services/adminService'
import { toast } from '@/composables/useToast'

import PageHeader from '@/components/common/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/common/EmptyState.vue'

import {
  Building,
  DollarSign,
  AlertTriangle,
  LogOut,
  Lock,
  Unlock,
  UploadCloud,
  Loader2,
  Trash2,
} from '@lucide/vue'
import { supabase } from '@/services/supabase'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const erro = ref('')
const resumo = ref({ totalEmpresas: 0, mrr: 0, totalAtrasadas: 0, assinaturas: [] })

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    resumo.value = await carregarDashboardAdmin()
  } catch (error) {
    erro.value = 'Não foi possível carregar o painel do superadmin.'
    toast.error('Erro', erro.value)
  } finally {
    loading.value = false
  }
}

async function handleAlternarStatus(empresaId, statusAtual) {
  const novoStatus = !statusAtual
  try {
    await alternarStatusEmpresa(empresaId, novoStatus)
    toast.success('Sucesso', `Empresa ${novoStatus ? 'reativada' : 'suspensa'} com sucesso.`)
    // Atualiza a lista localmente para ser mais rápido
    const ass = resumo.value.assinaturas.find((a) => a.empresas.id === empresaId)
    if (ass) {
      ass.empresas.ativo = novoStatus
    }
  } catch (error) {
    toast.error('Erro', 'Não foi possível alterar o status da empresa.')
    console.error(error)
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

function statusVariant(status) {
  const mapa = {
    teste: 'default',
    ativa: 'success',
    atrasada: 'destructive',
    cancelada: 'outline',
  }
  return mapa[status] || 'outline'
}

const fileInput = ref(null)
const restaurando = ref(false)
const alvoRestauracao = ref(null)

function abrirSeletorBackup(empresaId) {
  alvoRestauracao.value = empresaId
  fileInput.value?.click()
}

async function processarRestauracao(event) {
  const file = event.target.files[0]
  if (!file || !alvoRestauracao.value) return

  if (
    !confirm(
      'ATENÇÃO: Isso irá apagar TODOS os dados atuais desta empresa e substituí-los pelo backup! Tem certeza absoluta?',
    )
  ) {
    event.target.value = ''
    return
  }

  restaurando.value = true

  try {
    const text = await file.text()
    const json = JSON.parse(text)

    if (!json.meta || !json.dados) {
      throw new Error('Formato de backup inválido.')
    }

    // BLINDAGEM: Impede subir backup da empresa A na empresa B
    if (json.meta.empresa_id !== alvoRestauracao.value) {
      throw new Error(
        'OPERAÇÃO BLOQUEADA: Este arquivo de backup pertence a outra empresa! Você não pode restaurar os dados de uma assistência técnica em outra.',
      )
    }

    const { error } = await supabase.rpc('restaurar_backup_empresa', {
      p_empresa_id: alvoRestauracao.value,
      p_dados: json.dados,
    })

    if (error) throw error

    toast.success('Backup Restaurado!', 'Os dados da empresa foram recuperados com sucesso.')
  } catch (error) {
    console.error('Erro na restauração:', error)
    toast.error('Falha', error.message || 'Não foi possível restaurar o backup.')
  } finally {
    restaurando.value = false
    alvoRestauracao.value = null
    event.target.value = ''
  }
}

const resetando = ref(null)

async function handleResetarDados(empresa) {
  const confirmacao = prompt(
    `ATENÇÃO EXTREMA: Você está prestes a apagar TODOS os clientes, OS, estoque e finanças da loja "${empresa.nome_fantasia || empresa.razao_social}".\n\nEssa ação NÃO pode ser desfeita e zera a operação da empresa (os logins continuarão funcionando).\n\nPara confirmar, digite exatamente a frase abaixo:\n\nAPAGAR TUDO`,
  )

  if (confirmacao !== 'APAGAR TUDO') {
    if (confirmacao !== null) {
      toast.error('Cancelado', 'A frase de segurança não conferiu. Reset abortado.')
    }
    return
  }

  resetando.value = empresa.id
  try {
    const { error } = await supabase.rpc('resetar_dados_empresa', {
      p_empresa_id: empresa.id,
    })
    if (error) throw error
    toast.success('Reset Concluído', 'Todos os dados da empresa foram excluídos.')
  } catch (error) {
    console.error('Erro no reset:', error)
    toast.error('Erro', 'Falha ao tentar resetar os dados da empresa.')
  } finally {
    resetando.value = null
  }
}

async function handleSair() {
  await supabase.auth.signOut()
  router.push('/login')
}

onMounted(() => {
  if (!authStore.userProfile?.is_superadmin) {
    router.push('/')
    return
  }
  carregar()
})
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      eyebrow="Quartel General do SaaS"
      title="Painel da Plataforma"
      description="Visão global de todas as assistências técnicas assinantes."
      tip="Esta é uma área isolada restrita aos super administradores do sistema."
    >
      <template #actions>
        <Button variant="outline" class="gap-2" @click="handleSair">
          <LogOut class="w-4 h-4" /> Sair
        </Button>
      </template>
    </PageHeader>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-3">
      <Skeleton v-for="i in 3" :key="i" class="h-28 w-full" />
    </div>

    <div v-else-if="!erro" class="grid gap-4 sm:grid-cols-3">
      <Card class="border-border shadow-none">
        <CardContent class="flex items-start justify-between p-5">
          <div>
            <p class="text-sm text-muted-foreground">Total de Assistências</p>
            <p class="mt-2 text-2xl font-bold tracking-tight text-primary">
              {{ resumo.totalEmpresas }}
            </p>
          </div>
          <span
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7eef5] text-[#43627a]"
            ><Building class="h-5 w-5"
          /></span>
        </CardContent>
      </Card>

      <Card class="border-border shadow-none">
        <CardContent class="flex items-start justify-between p-5">
          <div>
            <p class="text-sm text-muted-foreground">MRR (Receita Recorrente)</p>
            <p class="mt-2 text-2xl font-bold tracking-tight text-primary">
              {{ formatarMoeda(resumo.mrr) }}
            </p>
          </div>
          <span
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e8f3e4] text-success"
            ><DollarSign class="h-5 w-5"
          /></span>
        </CardContent>
      </Card>

      <Card class="border-border shadow-none">
        <CardContent class="flex items-start justify-between p-5">
          <div>
            <p class="text-sm text-muted-foreground">Lojas Inadimplentes</p>
            <p class="mt-2 text-2xl font-bold tracking-tight text-destructive">
              {{ resumo.totalAtrasadas }}
            </p>
          </div>
          <span
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff0e9] text-destructive"
            ><AlertTriangle class="h-5 w-5"
          /></span>
        </CardContent>
      </Card>
    </div>

    <Card v-if="!loading && !erro" class="border-border shadow-none">
      <CardContent class="p-0">
        <div class="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 class="font-semibold text-primary">Lista de Lojas e Assinaturas</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Todas as empresas ativas ou canceladas na plataforma.
            </p>
          </div>
        </div>

        <EmptyState
          v-if="!resumo.assinaturas.length"
          title="Nenhuma empresa"
          description="Você ainda não tem clientes na base."
        />

        <div v-else>
          <!-- Desktop Table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead
                class="bg-surface-muted text-muted-foreground border-b border-border uppercase text-xs font-semibold"
              >
                <tr>
                  <th class="px-5 py-3">Assistência (Loja)</th>
                  <th class="px-5 py-3">Contato</th>
                  <th class="px-5 py-3">Plano</th>
                  <th class="px-5 py-3">Status</th>
                  <th class="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="assinatura in resumo.assinaturas"
                  :key="assinatura.id"
                  class="transition-colors hover:bg-surface-muted/50"
                >
                  <td class="px-5 py-4">
                    <p class="font-medium text-foreground">
                      {{ assinatura.empresas.nome_fantasia || 'Sem Nome' }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ assinatura.empresas.razao_social || 'N/A' }}
                    </p>
                  </td>
                  <td class="px-5 py-4 text-muted-foreground">
                    {{ assinatura.empresas.telefone || 'Sem contato' }}
                  </td>
                  <td class="px-5 py-4">
                    <p class="font-medium text-foreground">
                      {{ assinatura.planos?.nome || 'Plano Personalizado' }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ formatarMoeda(assinatura.planos?.valor) }}
                    </p>
                  </td>
                  <td class="px-5 py-4">
                    <Badge class="uppercase" :variant="statusVariant(assinatura.status)">{{
                      assinatura.status
                    }}</Badge>
                  </td>
                  <td class="px-5 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        class="gap-1 bg-surface"
                        :disabled="restaurando"
                        @click="abrirSeletorBackup(assinatura.empresas.id)"
                        title="Restaurar backup recebido (.json)"
                      >
                        <Loader2
                          v-if="restaurando && alvoRestauracao === assinatura.empresas.id"
                          class="w-4 h-4 animate-spin"
                        />
                        <UploadCloud v-else class="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        class="gap-1 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                        :disabled="resetando === assinatura.empresas.id"
                        @click="handleResetarDados(assinatura.empresas)"
                        title="Zerar operação da loja (Factory Reset)"
                      >
                        <Loader2
                          v-if="resetando === assinatura.empresas.id"
                          class="w-4 h-4 animate-spin"
                        />
                        <Trash2 v-else class="w-4 h-4" />
                      </Button>
                      <Button
                        :variant="assinatura.empresas.ativo ? 'outline' : 'default'"
                        size="sm"
                        class="gap-1 w-28 border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                        :class="
                          !assinatura.empresas.ativo &&
                          'bg-green-600 hover:bg-green-700 text-white border-none'
                        "
                        @click="
                          handleAlternarStatus(assinatura.empresas.id, assinatura.empresas.ativo)
                        "
                      >
                        <Lock v-if="assinatura.empresas.ativo" class="w-4 h-4" />
                        <Unlock v-else class="w-4 h-4" />
                        {{ assinatura.empresas.ativo ? 'Suspender' : 'Reativar' }}
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="grid grid-cols-1 gap-4 p-5 md:hidden">
            <div
              v-for="assinatura in resumo.assinaturas"
              :key="'mob-' + assinatura.id"
              class="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <div class="flex items-start justify-between">
                <div>
                  <p class="font-medium text-foreground">
                    {{ assinatura.empresas.nome_fantasia || 'Sem Nome' }}
                  </p>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    {{ assinatura.empresas.razao_social || 'N/A' }}
                  </p>
                </div>
                <Badge class="uppercase" :variant="statusVariant(assinatura.status)">{{
                  assinatura.status
                }}</Badge>
              </div>

              <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p class="text-muted-foreground text-xs">Contato</p>
                  <p class="font-medium">{{ assinatura.empresas.telefone || 'Sem contato' }}</p>
                </div>
                <div>
                  <p class="text-muted-foreground text-xs">Plano</p>
                  <p class="font-medium">{{ assinatura.planos?.nome || 'Personalizado' }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ formatarMoeda(assinatura.planos?.valor) }}
                  </p>
                </div>
              </div>

              <div class="pt-3 mt-1 border-t border-border flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="gap-1 bg-surface flex-1"
                  :disabled="restaurando"
                  @click="abrirSeletorBackup(assinatura.empresas.id)"
                  title="Restaurar backup"
                >
                  <Loader2
                    v-if="restaurando && alvoRestauracao === assinatura.empresas.id"
                    class="w-4 h-4 animate-spin"
                  />
                  <UploadCloud v-else class="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="gap-1 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white flex-1"
                  :disabled="resetando === assinatura.empresas.id"
                  @click="handleResetarDados(assinatura.empresas)"
                  title="Reset de Fábrica"
                >
                  <Loader2
                    v-if="resetando === assinatura.empresas.id"
                    class="w-4 h-4 animate-spin"
                  />
                  <Trash2 v-else class="w-4 h-4" />
                </Button>
                <Button
                  :variant="assinatura.empresas.ativo ? 'outline' : 'default'"
                  size="sm"
                  class="gap-1 flex-1 border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                  :class="
                    !assinatura.empresas.ativo &&
                    'bg-green-600 hover:bg-green-700 text-white border-none'
                  "
                  @click="handleAlternarStatus(assinatura.empresas.id, assinatura.empresas.ativo)"
                >
                  <Lock v-if="assinatura.empresas.ativo" class="w-4 h-4" />
                  <Unlock v-else class="w-4 h-4" />
                  {{ assinatura.empresas.ativo ? 'Susp.' : 'Reativ.' }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <input
      type="file"
      ref="fileInput"
      accept=".json"
      class="hidden"
      @change="processarRestauracao"
    />
  </div>
</template>
