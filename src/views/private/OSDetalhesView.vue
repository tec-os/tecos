<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/common/PageHeader.vue'
import {
  buscarOrdemServico,
  listarHistoricoOrdemServico,
  listarItensOrdemServico,
  criarItemOrdemServico,
  atualizarItemOrdemServico,
  excluirItemOrdemServico,
  atualizarOrdemServico,
  aprovarOrcamento,
  reprovarOrcamento,
} from '@/services/ordensServicoService'
import {
  listarAgendamentosDaOrdem,
  criarAgendamento,
  listarTecnicos,
} from '@/services/agendamentosService'
import { listarRecebimentosDaOrdem, criarRecebimento } from '@/services/recebimentosService'
import { listarLembretesDaReferencia, criarLembrete } from '@/services/lembretesService'
import { listarCatalogo } from '@/services/catalogoService'

import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'
import FormGroup from '@/components/ui/FormGroup.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Input from '@/components/ui/Input.vue'
import Badge from '@/components/ui/Badge.vue'
import Tabs from '@/components/ui/Tabs.vue'
import TabsList from '@/components/ui/TabsList.vue'
import TabsTrigger from '@/components/ui/TabsTrigger.vue'
import TabsContent from '@/components/ui/TabsContent.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Table from '@/components/ui/Table.vue'
import TableHeader from '@/components/ui/TableHeader.vue'
import TableBody from '@/components/ui/TableBody.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableHead from '@/components/ui/TableHead.vue'
import TableCell from '@/components/ui/TableCell.vue'
import Modal from '@/components/ui/Modal.vue'

import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Clock3,
  CreditCard,
  Save,
  FileText,
  History,
  Wrench,
  Plus,
  Trash2,
  Pencil,
  Printer,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const os = ref(null)
const loading = ref(true)
const salvando = ref(false)
const abaAtual = ref('operacao')
const empresaId = ref(null)

// Estado dos Itens
const itens = ref([])
const carregandoItens = ref(true)
const historico = ref([])
const carregandoHistorico = ref(true)
const agendamentos = ref([])
const recebimentos = ref([])
const lembretes = ref([])
const carregandoWorkspace = ref(true)
const catalogo = ref([])
const adicionandoItem = ref(false)
const excluindoItem = ref(false)
const isModalExclusaoItemOpen = ref(false)
const itemParaExcluir = ref(null)
const podeExcluirItem = computed(() =>
  ['gerente', 'tecnico'].includes(authStore.userProfile?.perfil),
)

// Controle de Modais de Operação
const tecnicos = ref([])
const isModalAgendaOpen = ref(false)
const salvandoAgenda = ref(false)
const formAgenda = ref({
  tecnico_id: '',
  data_inicio: '',
  data_fim: '',
  status: 'agendado',
  titulo: '',
})

const isModalRecebimentoOpen = ref(false)
const salvandoRecebimento = ref(false)
const formRecebimento = ref({
  valor: '',
  forma_pagamento: 'pix',
  status: 'pendente',
  vencimento: '',
  observacoes: '',
})

const isModalLembreteOpen = ref(false)
const salvandoLembrete = ref(false)
const formLembrete = ref({ mensagem: '', data_alvo: '' })

// Controle do Modal de Edição/Adição de Itens
const isModalItemOpen = ref(false)
const modoEdicaoItem = ref(false)
const idItemEdicao = ref(null)
const formItem = ref({
  tipo: 'servico',
  descricao: '',
  quantidade: 1,
  valor_unitario: '',
  catalogo_item_id: null,
})

// Fluxo de Orçamento
const isModalReprovarOpen = ref(false)
const salvandoOrcamento = ref(false)
const formReprovar = ref({ motivo: '' })

async function confirmarAprovacao() {
  salvandoOrcamento.value = true
  try {
    await aprovarOrcamento(os.value.id)
    toast.success('Aprovado', 'Orçamento aprovado pelo cliente. OS em andamento!')
    await carregarOS()
  } catch (error) {
    toast.error('Erro', 'Não foi possível registrar a aprovação.')
  } finally {
    salvandoOrcamento.value = false
  }
}

async function confirmarReprovacao() {
  if (!formReprovar.value.motivo.trim()) {
    toast.error('Atenção', 'Informe o motivo da reprovação.')
    return
  }
  salvandoOrcamento.value = true
  try {
    await reprovarOrcamento(os.value.id, formReprovar.value.motivo)
    toast.success('Reprovado', 'Orçamento foi reprovado e o atendimento encerrado.')
    isModalReprovarOpen.value = false
    await carregarOS()
  } catch (error) {
    toast.error('Erro', 'Não foi possível registrar a reprovação.')
  } finally {
    salvandoOrcamento.value = false
  }
}

// Calcula o total da OS dinamicamente
const valorTotalOS = computed(() => {
  return itens.value.reduce((total, item) => total + item.quantidade * item.valor_unitario, 0)
})

async function carregarOS() {
  try {
    empresaId.value = authStore.empresaId
    os.value = await buscarOrdemServico(route.params.id)

    await carregarItens()
    await carregarHistorico()
    await carregarWorkspace()
    await carregarCatalogo()
  } catch (error) {
    toast.error('Erro', 'OS não encontrada.')
    router.push('/ordens-servico')
  } finally {
    loading.value = false
  }
}

async function carregarCatalogo() {
  try {
    catalogo.value = await listarCatalogo(authStore.empresaId)
  } catch (error) {
    catalogo.value = []
  }
}

async function carregarWorkspace() {
  carregandoWorkspace.value = true
  try {
    const [agenda, cobrancas, lembretesDaOS] = await Promise.all([
      listarAgendamentosDaOrdem(os.value.id),
      listarRecebimentosDaOrdem(os.value.id),
      listarLembretesDaReferencia(authStore.empresaId, authStore.user?.id, os.value.id),
    ])
    agendamentos.value = agenda
    recebimentos.value = cobrancas
    lembretes.value = lembretesDaOS
  } catch (error) {
    toast.error('Workspace', 'Não foi possível carregar todos os dados relacionados da OS.')
  } finally {
    carregandoWorkspace.value = false
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

async function carregarHistorico() {
  try {
    historico.value = await listarHistoricoOrdemServico(os.value.id)
  } catch (error) {
    toast.error('Erro', 'Não foi possível carregar o histórico da OS.')
  } finally {
    carregandoHistorico.value = false
  }
}

function formatarEvento(evento) {
  return String(evento || 'Atualização').replaceAll('_', ' ')
}

function formatarDataHora(valor) {
  return valor
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(valor),
      )
    : '-'
}

async function abrirAgendaContextual() {
  if (!tecnicos.value.length) {
    try {
      tecnicos.value = await listarTecnicos(authStore.empresaId)
    } catch (error) {
      toast.error('Erro', 'Não foi possível carregar a equipe.')
    }
  }
  formAgenda.value = {
    tecnico_id: authStore.user?.id || '',
    data_inicio: '',
    data_fim: '',
    status: 'agendado',
    titulo: `Atendimento OS #${os.value.numero_os}`,
  }
  isModalAgendaOpen.value = true
}

async function salvarAgendaContextual() {
  if (!formAgenda.value.tecnico_id || !formAgenda.value.data_inicio || !formAgenda.value.data_fim) {
    toast.error('Atenção', 'Preencha os campos obrigatórios da agenda.')
    return
  }
  salvandoAgenda.value = true
  try {
    await criarAgendamento(empresaId.value, {
      tecnico_id: formAgenda.value.tecnico_id,
      cliente_id: os.value.cliente_id,
      os_id: os.value.id,
      titulo: formAgenda.value.titulo,
      data_inicio: new Date(formAgenda.value.data_inicio).toISOString(),
      data_fim: new Date(formAgenda.value.data_fim).toISOString(),
      status: formAgenda.value.status,
    })
    toast.success('Sucesso', 'Atendimento agendado.')
    isModalAgendaOpen.value = false
    await carregarWorkspace()
  } catch (error) {
    toast.error('Erro', 'Não foi possível salvar o agendamento.')
  } finally {
    salvandoAgenda.value = false
  }
}

function abrirRecebimentoContextual() {
  formRecebimento.value = {
    valor: os.value.valor_total || valorTotalOS.value,
    forma_pagamento: 'pix',
    status: 'pendente',
    vencimento: '',
    observacoes: '',
  }
  isModalRecebimentoOpen.value = true
}

async function salvarRecebimentoContextual() {
  if (!formRecebimento.value.valor || !formRecebimento.value.forma_pagamento) {
    toast.error('Atenção', 'Preencha o valor e a forma de pagamento.')
    return
  }
  salvandoRecebimento.value = true
  try {
    await criarRecebimento(empresaId.value, {
      os_id: os.value.id,
      valor: Number(formRecebimento.value.valor),
      forma_pagamento: formRecebimento.value.forma_pagamento.trim(),
      status: formRecebimento.value.status,
      vencimento: formRecebimento.value.vencimento || null,
      observacoes: formRecebimento.value.observacoes.trim() || null,
    })
    toast.success('Sucesso', 'Cobrança registrada.')
    isModalRecebimentoOpen.value = false
    await carregarWorkspace()
  } catch (error) {
    toast.error('Erro', 'Não foi possível salvar o recebimento.')
  } finally {
    salvandoRecebimento.value = false
  }
}

function abrirLembreteContextual() {
  formLembrete.value = { mensagem: `Acompanhar OS #${os.value.numero_os}`, data_alvo: '' }
  isModalLembreteOpen.value = true
}

async function salvarLembreteContextual() {
  if (!formLembrete.value.mensagem.trim() || !formLembrete.value.data_alvo) {
    toast.error('Atenção', 'Preencha a mensagem e a data do lembrete.')
    return
  }
  salvandoLembrete.value = true
  try {
    await criarLembrete(empresaId.value, authStore.user?.id, {
      tipo: 'os',
      referencia_id: os.value.id,
      mensagem: formLembrete.value.mensagem.trim(),
      data_alvo: new Date(formLembrete.value.data_alvo).toISOString(),
    })
    toast.success('Sucesso', 'Lembrete criado.')
    isModalLembreteOpen.value = false
    await carregarWorkspace()
  } catch (error) {
    toast.error('Erro', 'Não foi possível salvar o lembrete.')
  } finally {
    salvandoLembrete.value = false
  }
}

async function carregarItens() {
  try {
    itens.value = await listarItensOrdemServico(os.value.id)
  } catch (error) {
    toast.error('Erro', 'Não foi possível carregar os itens.')
  } finally {
    carregandoItens.value = false
  }
}

// Funções de Gestão de Peças e Serviços via Modal
function abrirModalNovoItem() {
  modoEdicaoItem.value = false
  idItemEdicao.value = null
  formItem.value = {
    tipo: 'servico',
    descricao: '',
    quantidade: 1,
    valor_unitario: '',
    catalogo_item_id: null,
  }
  isModalItemOpen.value = true
}

function selecionarItemCatalogo(itemId) {
  const item = catalogo.value.find((registro) => registro.id === itemId)
  if (!item) return
  formItem.value.tipo = item.tipo
  formItem.value.descricao = item.nome
  formItem.value.valor_unitario = item.preco
  formItem.value.catalogo_item_id = item.id
}

function editarItem(item) {
  modoEdicaoItem.value = true
  idItemEdicao.value = item.id
  formItem.value = {
    tipo: item.tipo, // Agora carrega 'servico' ou 'material' perfeitamente
    descricao: item.descricao,
    quantidade: item.quantidade,
    valor_unitario: item.valor_unitario,
    catalogo_item_id: item.catalogo_item_id || null,
  }
  isModalItemOpen.value = true
}

async function salvarItem() {
  if (!formItem.value.descricao || formItem.value.valor_unitario === '') {
    toast.error('Atenção', 'Preencha a descrição e o valor unitário.')
    return
  }

  const qtd = Number(formItem.value.quantidade) || 1
  adicionandoItem.value = true

  try {
    const payload = {
      tipo: formItem.value.tipo, // Envia 'servico' ou 'material' conforme o ENUM
      descricao: formItem.value.descricao,
      quantidade: qtd,
      valor_unitario: Number(formItem.value.valor_unitario),
      catalogo_item_id: formItem.value.catalogo_item_id || null,
    }

    if (modoEdicaoItem.value) {
      await atualizarItemOrdemServico(idItemEdicao.value, payload)
      toast.success('Sucesso', 'Item atualizado.')
    } else {
      await criarItemOrdemServico(empresaId.value, os.value.id, payload)
      toast.success('Sucesso', 'Item adicionado.')
    }

    isModalItemOpen.value = false
    await carregarItens()
  } catch (error) {
    console.error('Detalhe do Erro:', error)
    toast.error('Erro no Banco', error.message || 'Não foi possível salvar o item.')
  } finally {
    adicionandoItem.value = false
  }
}

function abrirAbaImpressao() {
  // Resolve a URL pelo Vue Router
  const url = router.resolve(`/ordens-servico/${os.value.id}/imprimir`).href
  // Abre em uma nova guia limpa
  window.open(url, '_blank')
}

function confirmarRemocaoItem(item) {
  itemParaExcluir.value = item
  isModalExclusaoItemOpen.value = true
}

async function removerItem() {
  if (!itemParaExcluir.value) return

  excluindoItem.value = true
  try {
    await excluirItemOrdemServico(itemParaExcluir.value.id)

    await carregarItens()
    isModalExclusaoItemOpen.value = false
    toast.success('Sucesso', 'Item removido com sucesso.')
  } catch (error) {
    toast.error('Erro', 'Não foi possível remover o item.')
  } finally {
    excluindoItem.value = false
    itemParaExcluir.value = null
  }
}

// Salva os dados de Laudo e Status
async function salvarOS() {
  salvando.value = true
  try {
    await atualizarOrdemServico(os.value.id, {
      status: os.value.status,
      diagnostico: os.value.diagnostico,
      solucao_executada: os.value.solucao_executada,
      obs_interna: os.value.obs_interna,
    })
    toast.success('Sucesso', 'Ordem de Serviço atualizada!')
  } catch (error) {
    toast.error('Erro', 'Não foi possível salvar a OS.')
  } finally {
    salvando.value = false
  }
}

function obterStatusVariant(status) {
  const mapa = {
    aberta: 'destructive',
    aguardando_aprovacao: 'warning',
    orcamento_reprovado: 'destructive',
    em_andamento: 'default',
    aguardando_peca: 'outline',
    concluida: 'success',
    cancelada: 'destructive',
  }
  return mapa[status] || 'outline'
}

onMounted(() => {
  carregarOS()
})
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <div v-if="loading" class="space-y-4">
      <Skeleton class="h-10 w-1/3" />
      <Skeleton class="h-64 w-full" />
    </div>

    <template v-else>
      <!-- Cabeçalho da OS -->
      <PageHeader
        eyebrow="Acompanhamento de serviço"
        :title="`OS #${os.numero_os}`"
        :description="`Cliente: ${os.clientes?.nome || 'não informado'}${os.clientes?.celular ? ` · ${os.clientes.celular}` : ''}`"
        tip="Atualize o status conforme o serviço avança. Registre diagnóstico e solução na primeira aba; use peças e serviços para formar o valor do atendimento."
      >
        <template #actions>
          <Button
            variant="ghost"
            size="icon"
            title="Voltar para ordens de serviço"
            @click="router.push('/ordens-servico')"
            ><ArrowLeft class="h-5 w-5"
          /></Button>
          <Button variant="outline" class="gap-2" @click="abrirAbaImpressao">
            <Printer class="w-4 h-4" />
            Imprimir
          </Button>
          <Button variant="default" class="gap-2" @click="salvarOS" :disabled="salvando">
            <Save class="w-4 h-4" />
            {{ salvando ? 'Salvando...' : 'Salvar Alterações' }}
          </Button>
        </template>
      </PageHeader>

      <!-- Painel de Orçamento -->
      <Card
        v-if="os.status === 'aguardando_aprovacao'"
        class="border-orange-200 bg-orange-50 shadow-sm mb-6"
      >
        <CardContent class="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 class="font-bold text-orange-900 text-lg">Orçamento Aguardando Aprovação</h2>
            <p class="text-orange-800 text-sm mt-1">
              O cliente já respondeu sobre o orçamento de {{ formatarMoeda(valorTotalOS) }}?
            </p>
          </div>
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              class="w-full sm:w-auto border-orange-300 text-orange-800 hover:bg-orange-100"
              @click="isModalReprovarOpen = true"
              >Reprovar</Button
            >
            <Button
              class="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              @click="confirmarAprovacao"
              :disabled="salvandoOrcamento"
            >
              {{ salvandoOrcamento ? 'Registrando...' : 'Aprovar Orçamento' }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs v-model="abaAtual" class="w-full">
        <TabsList
          class="flex w-full justify-start gap-1 overflow-x-auto overflow-y-hidden custom-scrollbar mb-6"
        >
          <TabsTrigger value="operacao" class="shrink-0 gap-2"
            ><Wrench class="w-4 h-4" /> Operação</TabsTrigger
          >
          <TabsTrigger value="laudo" class="shrink-0 gap-2"
            ><FileText class="w-4 h-4" /> Diagnóstico e Laudo</TabsTrigger
          >
          <TabsTrigger value="itens" class="shrink-0 gap-2"
            ><Wrench class="w-4 h-4" /> Peças e Serviços</TabsTrigger
          >
          <TabsTrigger value="historico" class="shrink-0 gap-2"
            ><History class="w-4 h-4" /> Histórico</TabsTrigger
          >
        </TabsList>

        <TabsContent value="operacao">
          <div class="grid gap-6 lg:grid-cols-3">
            <Card class="border-border shadow-none lg:col-span-2">
              <CardContent class="p-5 sm:p-6">
                <div class="flex items-start gap-3">
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-primary"
                    ><Wrench class="h-5 w-5"
                  /></span>
                  <div>
                    <h2 class="font-semibold text-primary">Resumo do atendimento</h2>
                    <p class="mt-1 text-sm text-muted-foreground">
                      Tudo que está relacionado a esta OS aparece aqui.
                    </p>
                  </div>
                </div>
                <div
                  v-if="os.equipamentos"
                  class="mt-6 rounded-lg border border-[#c8d9ce] bg-[#eef3ee] p-4"
                >
                  <div
                    class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#376056]"
                  >
                    <Wrench class="h-4 w-4" /> Equipamento
                  </div>
                  <p class="mt-2 font-medium text-primary">
                    {{ os.equipamentos.tipo
                    }}{{
                      os.equipamentos.marca || os.equipamentos.modelo
                        ? ` · ${[os.equipamentos.marca, os.equipamentos.modelo].filter(Boolean).join(' ')}`
                        : ''
                    }}
                  </p>
                  <p
                    v-if="os.equipamentos.numero_serie || os.equipamentos.identificacao"
                    class="mt-1 text-xs text-muted-foreground"
                  >
                    {{ os.equipamentos.numero_serie || os.equipamentos.identificacao }}
                  </p>
                </div>
                <div class="mt-6 grid gap-3 sm:grid-cols-3">
                  <div class="rounded-lg bg-surface-muted p-4">
                    <CalendarDays class="h-4 w-4 text-primary" />
                    <p class="mt-3 text-xs text-muted-foreground">Agendamentos</p>
                    <strong class="text-xl text-primary">{{ agendamentos.length }}</strong
                    ><Button
                      size="sm"
                      variant="ghost"
                      class="mt-2 px-0 text-primary"
                      @click="abrirAgendaContextual"
                      >Agendar atendimento</Button
                    >
                  </div>
                  <div class="rounded-lg bg-surface-muted p-4">
                    <CreditCard class="h-4 w-4 text-primary" />
                    <p class="mt-3 text-xs text-muted-foreground">Recebimentos</p>
                    <strong class="text-xl text-primary">{{ recebimentos.length }}</strong
                    ><Button
                      size="sm"
                      variant="ghost"
                      class="mt-2 px-0 text-primary"
                      @click="abrirRecebimentoContextual"
                      >Registrar cobrança</Button
                    >
                  </div>
                  <div class="rounded-lg bg-surface-muted p-4">
                    <Bell class="h-4 w-4 text-primary" />
                    <p class="mt-3 text-xs text-muted-foreground">Lembretes</p>
                    <strong class="text-xl text-primary">{{
                      lembretes.filter((item) => !item.lido).length
                    }}</strong
                    ><Button
                      size="sm"
                      variant="ghost"
                      class="mt-2 px-0 text-primary"
                      @click="abrirLembreteContextual"
                      >Criar lembrete</Button
                    >
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card class="border-primary bg-primary text-primary-foreground shadow-none"
              ><CardContent class="flex h-full flex-col justify-between p-5"
                ><div>
                  <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#d6f36b]">
                    Próximo passo
                  </p>
                  <h2 class="mt-3 text-xl font-semibold">Mantenha o atendimento em movimento</h2>
                  <p class="mt-2 text-sm leading-6 text-[#c5d8cf]">
                    Use as abas para registrar o laudo, lançar itens, consultar o histórico e
                    acompanhar o que foi combinado.
                  </p>
                </div>
                <div class="mt-6 space-y-2 text-sm text-[#dce9df]">
                  <p class="flex items-center gap-2">
                    <CalendarDays class="h-4 w-4 text-[#d6f36b]" />
                    {{
                      agendamentos.length ? 'Há atendimento agendado' : 'Nenhum agendamento ainda'
                    }}
                  </p>
                  <p class="flex items-center gap-2">
                    <CreditCard class="h-4 w-4 text-[#d6f36b]" />
                    {{
                      recebimentos.length ? 'Cobrança registrada' : 'Nenhuma cobrança registrada'
                    }}
                  </p>
                </div></CardContent
              ></Card
            >
          </div>
        </TabsContent>

        <!-- Aba 1: Laudo Técnico e Status -->
        <TabsContent value="laudo">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 space-y-6">
              <Card>
                <CardContent class="p-6 space-y-6">
                  <div
                    v-if="os.equipamentos"
                    class="rounded-lg border border-[#c8d9ce] bg-[#eef3ee] p-3"
                  >
                    <p class="text-xs font-semibold uppercase tracking-wide text-[#376056]">
                      Equipamento atendido
                    </p>
                    <p class="mt-1 font-medium text-primary">
                      {{ os.equipamentos.tipo
                      }}{{
                        os.equipamentos.marca || os.equipamentos.modelo
                          ? ` · ${[os.equipamentos.marca, os.equipamentos.modelo].filter(Boolean).join(' ')}`
                          : ''
                      }}
                    </p>
                    <p
                      v-if="os.equipamentos.numero_serie || os.equipamentos.identificacao"
                      class="mt-1 text-xs text-muted-foreground"
                    >
                      {{ os.equipamentos.numero_serie || os.equipamentos.identificacao }}
                    </p>
                  </div>
                  <FormGroup id="problema" label="Problema Relatado (Pelo Cliente)">
                    <Textarea
                      id="problema"
                      rows="3"
                      v-model="os.descricao_problema"
                      disabled
                      class="bg-slate-50"
                    />
                  </FormGroup>

                  <FormGroup id="diagnostico" label="Diagnóstico Técnico">
                    <Textarea
                      id="diagnostico"
                      rows="4"
                      v-model="os.diagnostico"
                      placeholder="Descreva o que foi analisado e encontrado..."
                    />
                  </FormGroup>

                  <FormGroup id="solucao" label="Solução Executada">
                    <Textarea
                      id="solucao"
                      rows="4"
                      v-model="os.solucao_executada"
                      placeholder="Descreva o que foi feito para resolver o problema..."
                    />
                  </FormGroup>
                </CardContent>
              </Card>
            </div>

            <div class="space-y-6">
              <Card>
                <CardContent class="p-6 space-y-6">
                  <FormGroup id="status" label="Status Atual">
                    <Select id="status" v-model="os.status">
                      <option value="aberta">Aberta</option>
                      <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                      <option value="orcamento_reprovado">Orçamento Reprovado</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="aguardando_peca">Aguardando Peça</option>
                      <option value="concluida">Concluída</option>
                      <option value="cancelada">Cancelada</option>
                    </Select>
                  </FormGroup>

                  <FormGroup id="obs" label="Anotações Internas">
                    <Textarea
                      id="obs"
                      rows="5"
                      v-model="os.obs_interna"
                      placeholder="Informação invisível ao cliente..."
                    />
                  </FormGroup>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <!-- Aba 2: Peças e Serviços -->
        <TabsContent value="itens">
          <Card>
            <CardContent class="p-0">
              <!-- Cabeçalho da Lista de Itens -->
              <div
                class="p-4 bg-white border-b border-border flex items-center justify-between rounded-t-xl"
              >
                <h3 class="font-bold text-lg text-slate-800">Lista de Itens</h3>
                <Button variant="default" class="gap-2" @click="abrirModalNovoItem">
                  <Plus class="w-4 h-4" />
                  Adicionar Item
                </Button>
              </div>

              <!-- ========================================== -->
              <!-- VISÃO DESKTOP (TABELA) -->
              <!-- ========================================== -->
              <div class="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead class="text-center">Qtd</TableHead>
                      <TableHead class="text-right">Valor Unitário</TableHead>
                      <TableHead class="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-if="carregandoItens">
                      <TableCell colspan="6" class="text-center py-4"
                        ><Skeleton class="h-4 w-32 mx-auto"
                      /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="itens.length === 0">
                      <TableCell colspan="6" class="text-center text-muted-foreground py-8"
                        >Nenhuma peça ou serviço adicionado.</TableCell
                      >
                    </TableRow>
                    <TableRow v-else v-for="item in itens" :key="item.id">
                      <TableCell>
                        <!-- Atualizado para exibir Material em vez de Peça -->
                        <Badge :variant="item.tipo === 'servico' ? 'default' : 'secondary'">
                          {{ item.tipo === 'servico' ? 'Serviço' : 'Material' }}
                        </Badge>
                      </TableCell>
                      <TableCell class="font-medium">{{ item.descricao }}</TableCell>
                      <TableCell class="text-center">{{ item.quantidade }}</TableCell>
                      <TableCell class="text-right text-muted-foreground">{{
                        formatarMoeda(item.valor_unitario)
                      }}</TableCell>
                      <TableCell class="text-right font-medium">{{
                        formatarMoeda(item.quantidade * item.valor_unitario)
                      }}</TableCell>
                      <TableCell class="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          @click="editarItem(item)"
                          title="Editar"
                        >
                          <Pencil class="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          v-if="podeExcluirItem"
                          variant="ghost"
                          size="icon"
                          @click="confirmarRemocaoItem(item)"
                          title="Remover"
                        >
                          <Trash2 class="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <!-- ========================================== -->
              <!-- VISÃO MOBILE (CARDS) -->
              <!-- ========================================== -->
              <div class="grid md:hidden gap-3 p-4 bg-slate-50/50">
                <div v-if="carregandoItens" v-for="i in 2" :key="'mob-item-' + i">
                  <Card>
                    <CardContent class="p-4 space-y-2">
                      <Skeleton class="h-4 w-1/3" />
                      <Skeleton class="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                </div>

                <div v-else-if="itens.length === 0" class="py-6 text-center text-muted-foreground">
                  <p class="text-sm">Nenhuma peça ou serviço adicionado.</p>
                </div>

                <Card v-else v-for="item in itens" :key="'mob-card-' + item.id" class="shadow-sm">
                  <CardContent class="p-4 flex flex-col gap-3">
                    <div class="flex justify-between items-start gap-2">
                      <div class="space-y-1.5">
                        <!-- Atualizado para exibir Material em vez de Peça -->
                        <Badge :variant="item.tipo === 'servico' ? 'default' : 'secondary'">
                          {{ item.tipo === 'servico' ? 'Serviço' : 'Material' }}
                        </Badge>
                        <h4 class="font-bold text-foreground leading-tight">
                          {{ item.descricao }}
                        </h4>
                      </div>
                      <div class="flex gap-1 -mr-2 -mt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          @click="editarItem(item)"
                          class="text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil class="w-4 h-4" />
                        </Button>
                        <Button
                          v-if="podeExcluirItem"
                          variant="ghost"
                          size="icon"
                          @click="confirmarRemocaoItem(item)"
                          class="text-red-500 hover:bg-red-50 hover:text-red-600"
                          title="Remover"
                        >
                          <Trash2 class="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-sm pt-3 border-t border-border/50">
                      <div>
                        <span class="text-muted-foreground block text-xs mb-0.5"
                          >Qtd x Valor Unit.</span
                        >
                        <span class="font-medium text-slate-700"
                          >{{ item.quantidade }}x {{ formatarMoeda(item.valor_unitario) }}</span
                        >
                      </div>
                      <div class="text-right">
                        <span class="text-muted-foreground block text-xs mb-0.5">Subtotal</span>
                        <span class="font-bold text-slate-800">{{
                          formatarMoeda(item.quantidade * item.valor_unitario)
                        }}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <!-- Totalizador -->
              <div
                class="p-4 bg-slate-50 border-t border-border flex justify-end items-center gap-4 rounded-b-xl"
              >
                <span class="text-muted-foreground font-medium">Total da OS:</span>
                <span class="text-2xl font-bold text-slate-800">{{
                  formatarMoeda(valorTotalOS)
                }}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent class="p-5 sm:p-6">
              <div class="mb-6 flex items-start gap-3">
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-primary"
                  ><History class="h-5 w-5"
                /></span>
                <div>
                  <h3 class="font-semibold text-primary">Linha do tempo</h3>
                  <p class="mt-1 text-sm text-muted-foreground">
                    Acompanhe as alterações registradas automaticamente nesta OS.
                  </p>
                </div>
              </div>
              <div v-if="carregandoHistorico" class="space-y-5">
                <div v-for="item in 3" :key="item" class="flex gap-4">
                  <Skeleton class="h-9 w-9 shrink-0 rounded-full" />
                  <div class="flex-1 space-y-2">
                    <Skeleton class="h-4 w-1/3" /><Skeleton class="h-4 w-2/3" />
                  </div>
                </div>
              </div>
              <div
                v-else-if="historico.length === 0"
                class="py-8 text-center text-sm text-muted-foreground"
              >
                Ainda não há eventos registrados para esta OS.
              </div>
              <ol v-else class="relative ml-4 border-l border-border pl-7">
                <li v-for="evento in historico" :key="evento.id" class="relative pb-7 last:pb-0">
                  <span
                    class="absolute left-[-2.15rem] top-0 flex h-7 w-7 items-center justify-center rounded-full border-4 border-surface bg-primary text-primary-foreground"
                    ><Clock3 class="h-3 w-3"
                  /></span>
                  <div
                    class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div>
                      <p class="font-semibold capitalize text-foreground">
                        {{ formatarEvento(evento.evento) }}
                      </p>
                      <p
                        v-if="evento.detalhes"
                        class="mt-1 text-sm leading-6 text-muted-foreground"
                      >
                        {{ evento.detalhes }}
                      </p>
                      <p class="mt-1 text-xs text-muted-foreground">
                        Por {{ evento.usuarios?.nome || 'sistema' }}
                      </p>
                    </div>
                    <time class="shrink-0 text-xs text-muted-foreground">{{
                      formatarDataHora(evento.created_at)
                    }}</time>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <!-- ========================================== -->
      <!-- MODAL DE NOVO/EDITAR ITEM -->
      <!-- ========================================== -->
      <Modal
        v-model="isModalItemOpen"
        :title="modoEdicaoItem ? 'Editar Item' : 'Novo Item'"
        :description="
          modoEdicaoItem
            ? 'Atualize os valores deste serviço ou material.'
            : 'Adicione um novo material ou serviço à OS.'
        "
        size="md"
      >
        <div class="space-y-4 py-4">
          <FormGroup
            v-if="catalogo.length && !modoEdicaoItem"
            id="catalogo_item"
            label="Usar item do catálogo (opcional)"
            description="Escolha um serviço ou material para preencher descrição e preço automaticamente."
          >
            <Select id="catalogo_item" @update:model-value="selecionarItemCatalogo">
              <option value="">Escolha um item ou preencha manualmente</option>
              <option v-for="item in catalogo" :key="item.id" :value="item.id">
                {{ item.tipo === 'servico' ? 'Serviço' : 'Material' }} · {{ item.nome }} ·
                {{ formatarMoeda(item.preco)
                }}{{ item.controlar_estoque ? ` (Estoque: ${item.estoque_atual})` : '' }}
              </option>
            </Select>
          </FormGroup>
          <FormGroup id="tipo_item" label="Tipo">
            <Select id="tipo_item" v-model="formItem.tipo">
              <option value="servico">Serviço</option>
              <!-- Atualizado para o valor exato do ENUM do banco -->
              <option value="material">Material</option>
            </Select>
          </FormGroup>

          <FormGroup id="desc_item" label="Descrição">
            <Input
              id="desc_item"
              v-model="formItem.descricao"
              placeholder="Ex: Formatação, Memória RAM..."
            />
          </FormGroup>

          <div class="grid grid-cols-2 gap-4">
            <FormGroup id="qtd_item" label="Quantidade">
              <Input id="qtd_item" type="number" min="1" v-model="formItem.quantidade" />
            </FormGroup>

            <FormGroup id="valor_item" label="Valor Unit. (R$)">
              <Input
                id="valor_item"
                type="number"
                step="0.01"
                v-model="formItem.valor_unitario"
                placeholder="0.00"
              />
            </FormGroup>
          </div>
        </div>

        <template #footer>
          <Button variant="ghost" @click="isModalItemOpen = false" :disabled="adicionandoItem">
            Cancelar
          </Button>
          <Button variant="default" @click="salvarItem" :disabled="adicionandoItem">
            {{
              adicionandoItem ? 'Salvando...' : modoEdicaoItem ? 'Atualizar Item' : 'Adicionar Item'
            }}
          </Button>
        </template>
      </Modal>

      <Modal
        v-model="isModalExclusaoItemOpen"
        title="Remover item"
        description="Esta acao nao pode ser desfeita."
        size="sm"
      >
        <p class="text-sm text-muted-foreground">
          Deseja remover o item "{{ itemParaExcluir?.descricao }}"?
        </p>

        <template #footer>
          <Button
            variant="ghost"
            @click="isModalExclusaoItemOpen = false"
            :disabled="excluindoItem"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            @click="removerItem"
            :disabled="excluindoItem"
            class="gap-2"
          >
            <Trash2 class="w-4 h-4" />
            {{ excluindoItem ? 'Removendo...' : 'Remover item' }}
          </Button>
        </template>
      </Modal>
    </template>

    <!-- Modal de Agenda Contextual -->
    <Modal
      v-model="isModalAgendaOpen"
      title="Agendar atendimento"
      description="Marque um horário para esta OS."
      size="md"
    >
      <div class="space-y-4 py-4">
        <FormGroup id="agenda_tecnico" label="Técnico responsável">
          <Select id="agenda_tecnico" v-model="formAgenda.tecnico_id">
            <option value="">Selecione o técnico</option>
            <option v-for="t in tecnicos" :key="t.id" :value="t.id">{{ t.nome }}</option>
          </Select>
        </FormGroup>
        <FormGroup id="agenda_titulo" label="Título do agendamento">
          <Input id="agenda_titulo" v-model="formAgenda.titulo" />
        </FormGroup>
        <div class="grid grid-cols-2 gap-4">
          <FormGroup id="agenda_inicio" label="Início">
            <Input id="agenda_inicio" type="datetime-local" v-model="formAgenda.data_inicio" />
          </FormGroup>
          <FormGroup id="agenda_fim" label="Fim">
            <Input id="agenda_fim" type="datetime-local" v-model="formAgenda.data_fim" />
          </FormGroup>
        </div>
        <FormGroup id="agenda_status" label="Status do agendamento">
          <Select id="agenda_status" v-model="formAgenda.status">
            <option value="agendado">Agendado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </Select>
        </FormGroup>
      </div>
      <template #footer>
        <Button variant="ghost" @click="isModalAgendaOpen = false" :disabled="salvandoAgenda"
          >Cancelar</Button
        >
        <Button variant="default" @click="salvarAgendaContextual" :disabled="salvandoAgenda">{{
          salvandoAgenda ? 'Salvando...' : 'Agendar'
        }}</Button>
      </template>
    </Modal>

    <!-- Modal de Recebimento Contextual -->
    <Modal
      v-model="isModalRecebimentoOpen"
      title="Registrar cobrança"
      description="Vincule um recebimento diretamente a esta OS."
      size="md"
    >
      <div class="space-y-4 py-4">
        <FormGroup id="rec_valor" label="Valor (R$)">
          <Input id="rec_valor" type="number" step="0.01" v-model="formRecebimento.valor" />
        </FormGroup>
        <div class="grid grid-cols-2 gap-4">
          <FormGroup id="rec_forma" label="Forma de pagamento">
            <Input
              id="rec_forma"
              v-model="formRecebimento.forma_pagamento"
              placeholder="Ex: Pix, Cartão"
            />
          </FormGroup>
          <FormGroup id="rec_status" label="Status">
            <Select id="rec_status" v-model="formRecebimento.status">
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="vencido">Vencido</option>
            </Select>
          </FormGroup>
        </div>
        <FormGroup id="rec_vencimento" label="Data de Vencimento">
          <Input id="rec_vencimento" type="date" v-model="formRecebimento.vencimento" />
        </FormGroup>
      </div>
      <template #footer>
        <Button
          variant="ghost"
          @click="isModalRecebimentoOpen = false"
          :disabled="salvandoRecebimento"
          >Cancelar</Button
        >
        <Button
          variant="default"
          @click="salvarRecebimentoContextual"
          :disabled="salvandoRecebimento"
          >{{ salvandoRecebimento ? 'Salvando...' : 'Salvar cobrança' }}</Button
        >
      </template>
    </Modal>

    <!-- Modal de Lembrete Contextual -->
    <Modal
      v-model="isModalLembreteOpen"
      title="Criar lembrete"
      description="Adicione um lembrete vinculado a esta OS."
      size="md"
    >
      <div class="space-y-4 py-4">
        <FormGroup id="lembrete_msg" label="Mensagem">
          <Input id="lembrete_msg" v-model="formLembrete.mensagem" />
        </FormGroup>
        <FormGroup id="lembrete_data" label="Data e hora do aviso">
          <Input id="lembrete_data" type="datetime-local" v-model="formLembrete.data_alvo" />
        </FormGroup>
      </div>
      <template #footer>
        <Button variant="ghost" @click="isModalLembreteOpen = false" :disabled="salvandoLembrete"
          >Cancelar</Button
        >
        <Button variant="default" @click="salvarLembreteContextual" :disabled="salvandoLembrete">{{
          salvandoLembrete ? 'Salvando...' : 'Criar lembrete'
        }}</Button>
      </template>
    </Modal>

    <!-- Modal de Reprovação de Orçamento -->
    <Modal
      v-model="isModalReprovarOpen"
      title="Reprovar Orçamento"
      description="Informe o motivo da reprovação pelo cliente."
      size="md"
    >
      <div class="space-y-4 py-4">
        <FormGroup id="motivo_reprovacao" label="Motivo">
          <Textarea
            id="motivo_reprovacao"
            rows="4"
            v-model="formReprovar.motivo"
            placeholder="Ex: Cliente achou muito caro e desistiu do conserto."
          />
        </FormGroup>
      </div>
      <template #footer>
        <Button variant="ghost" @click="isModalReprovarOpen = false" :disabled="salvandoOrcamento"
          >Cancelar</Button
        >
        <Button variant="destructive" @click="confirmarReprovacao" :disabled="salvandoOrcamento">{{
          salvandoOrcamento ? 'Reprovando...' : 'Confirmar Reprovação'
        }}</Button>
      </template>
    </Modal>
  </div>
</template>
