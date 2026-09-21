<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute } from 'vue-router'
import { toast } from '@/composables/useToast'
import {
  atualizarEquipamento,
  criarEquipamento,
  excluirEquipamento,
  listarClientesParaEquipamentos,
  listarEquipamentos,
  listarHistoricoEquipamento,
} from '@/services/equipamentosService'

import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import FormGroup from '@/components/ui/FormGroup.vue'
import Modal from '@/components/ui/Modal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from '@lucide/vue'

const authStore = useAuthStore()
const route = useRoute()
const equipamentos = ref([])
const clientes = ref([])
const loading = ref(true)
const carregandoClientes = ref(true)
const erro = ref('')
const busca = ref('')
const clienteFiltro = ref('')
const pagina = ref(1)
const total = ref(0)
const porPagina = 20
const modalAberto = ref(false)
const modalExclusaoAberto = ref(false)
const salvando = ref(false)
const excluindo = ref(false)
const equipamentoSelecionado = ref(null)
const historicoAberto = ref(false)
const historicoCarregando = ref(false)
const historicoEquipamento = ref(null)
const historicoOS = ref([])
let buscaTimer = null

const formularioVazio = () => ({
  id: null,
  cliente_id: '',
  tipo: '',
  marca: '',
  modelo: '',
  numero_serie: '',
  identificacao: '',
  observacoes: '',
})
const formulario = ref(formularioVazio())
const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / porPagina)))

async function carregar() {
  if (!authStore.empresaId) return
  loading.value = true
  erro.value = ''
  try {
    const resultado = await listarEquipamentos(authStore.empresaId, {
      pagina: pagina.value,
      porPagina,
      busca: busca.value,
      clienteId: clienteFiltro.value,
    })
    equipamentos.value = resultado.items
    total.value = resultado.total
  } catch (error) {
    erro.value = 'Não foi possível carregar os equipamentos.'
    toast.error('Equipamentos', erro.value)
  } finally {
    loading.value = false
  }
}

async function carregarClientes() {
  if (!authStore.empresaId) return
  try {
    clientes.value = await listarClientesParaEquipamentos(authStore.empresaId)
  } catch (error) {
    toast.error('Equipamentos', 'Não foi possível carregar os clientes.')
  } finally {
    carregandoClientes.value = false
  }
}

function abrirNovo() {
  formulario.value = { ...formularioVazio(), cliente_id: route.query.cliente || '' }
  modalAberto.value = true
}
function abrirEdicao(item) {
  formulario.value = { ...item }
  modalAberto.value = true
}
function confirmarExclusao(item) {
  equipamentoSelecionado.value = item
  modalExclusaoAberto.value = true
}
async function abrirHistorico(item) {
  historicoEquipamento.value = item
  historicoAberto.value = true
  historicoCarregando.value = true
  try {
    historicoOS.value = await listarHistoricoEquipamento(item.id)
  } catch (error) {
    historicoOS.value = []
    toast.error('Histórico', 'Não foi possível carregar os atendimentos deste equipamento.')
  } finally {
    historicoCarregando.value = false
  }
}
function formatarData(valor) {
  return valor
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(valor))
    : '-'
}
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

async function salvar() {
  if (!formulario.value.cliente_id || !formulario.value.tipo.trim()) {
    toast.error('Atenção', 'Selecione o cliente e informe o tipo do equipamento.')
    return
  }
  salvando.value = true
  const payload = {
    cliente_id: formulario.value.cliente_id,
    tipo: formulario.value.tipo.trim(),
    marca: formulario.value.marca.trim() || null,
    modelo: formulario.value.modelo.trim() || null,
    numero_serie: formulario.value.numero_serie.trim() || null,
    identificacao: formulario.value.identificacao.trim() || null,
    observacoes: formulario.value.observacoes.trim() || null,
  }
  try {
    if (formulario.value.id) {
      await atualizarEquipamento(formulario.value.id, payload)
      toast.success('Sucesso', 'Equipamento atualizado.')
    } else {
      await criarEquipamento(authStore.empresaId, payload)
      toast.success('Sucesso', 'Equipamento cadastrado.')
    }
    modalAberto.value = false
    await carregar()
  } catch (error) {
    toast.error('Erro', 'Não foi possível salvar o equipamento.')
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  if (!equipamentoSelecionado.value) return
  excluindo.value = true
  try {
    await excluirEquipamento(equipamentoSelecionado.value.id)
    modalExclusaoAberto.value = false
    toast.success('Sucesso', 'Equipamento arquivado.')
    await carregar()
  } catch (error) {
    toast.error('Erro', 'Não foi possível arquivar o equipamento.')
  } finally {
    excluindo.value = false
    equipamentoSelecionado.value = null
  }
}

function mudarPagina(novaPagina) {
  if (novaPagina < 1 || novaPagina > totalPaginas.value || novaPagina === pagina.value) return
  pagina.value = novaPagina
  carregar()
}
watch(busca, () => {
  pagina.value = 1
  clearTimeout(buscaTimer)
  buscaTimer = setTimeout(carregar, 300)
})
watch(clienteFiltro, () => {
  pagina.value = 1
  carregar()
})
watch(
  () => authStore.empresaId,
  (empresaId) => {
    if (empresaId) {
      carregar()
      carregarClientes()
    }
  },
  { immediate: true },
)
watch(
  () => [authStore.empresaId, route.query.novo],
  ([empresaId, novo]) => {
    if (empresaId && novo === '1') abrirNovo()
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      eyebrow="Patrimônio atendido"
      title="Equipamentos"
      description="Cadastre os aparelhos de cada cliente para manter o histórico de atendimento organizado."
      tip="Um equipamento representa o aparelho que costuma voltar para manutenção: notebook, celular, impressora ou outro. Não salve senhas de acesso aqui."
    >
      <template #actions
        ><Button class="w-full gap-2 sm:w-auto" @click="abrirNovo"
          ><Plus class="h-4 w-4" />Novo equipamento</Button
        ></template
      >
    </PageHeader>

    <Card class="border-border shadow-none"
      ><CardContent class="flex flex-col gap-3 p-4 sm:flex-row"
        ><div class="relative flex-1">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input
            v-model="busca"
            class="pl-9"
            placeholder="Buscar tipo, marca, modelo ou série"
          />
        </div>
        <Select v-model="clienteFiltro" class="sm:max-w-xs" :disabled="carregandoClientes"
          ><option value="">Todos os clientes</option>
          <option v-for="cliente in clientes" :key="cliente.id" :value="cliente.id">
            {{ cliente.nome }}
          </option></Select
        ></CardContent
      ></Card
    >
    <div
      v-if="erro"
      class="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-[#fff8f4] px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{{ erro }}</span
      ><Button variant="outline" size="sm" @click="carregar">Tentar novamente</Button>
    </div>

    <Card v-if="false" class="border-border shadow-none"
      ><CardContent class="p-0"
        ><div v-if="loading" class="grid gap-3 p-4 sm:grid-cols-2">
          <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
        </div>
        <EmptyState
          v-else-if="!equipamentos.length"
          title="Nenhum equipamento cadastrado"
          description="Cadastre o primeiro aparelho para acompanhar os atendimentos desse cliente."
          action-label="Novo equipamento"
          @action="abrirNovo" />
        <div v-else class="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card v-if="false" v-for="item in equipamentos" :key="item.id" class="border-border shadow-sm"
            ><CardContent class="p-4"
              ><div class="flex items-start justify-between gap-3">
                <span
                  class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e7eef5] text-[#43627a]"
                  ><Wrench class="h-4 w-4"
                /></span>
                <div class="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar equipamento"
                    @click="abrirEdicao(item)"
                    ><Pencil class="h-4 w-4" /></Button
                  ><Button
                    variant="ghost"
                    size="icon"
                    title="Arquivar equipamento"
                    @click="confirmarExclusao(item)"
                    ><Trash2 class="h-4 w-4 text-destructive"
                  /></Button>
                </div>
              </div>
              <h3 class="mt-4 font-semibold text-primary">
                {{ item.tipo
                }}<span v-if="item.marca || item.modelo">
                  · {{ [item.marca, item.modelo].filter(Boolean).join(' ') }}</span
                >
              </h3>
              <p class="mt-1 text-sm text-muted-foreground">
                Cliente: {{ item.clientes?.nome || 'Não informado' }}
              </p>
              <p
                v-if="item.numero_serie || item.identificacao"
                class="mt-2 text-xs text-muted-foreground"
              >
                {{ item.numero_serie || item.identificacao }}
              </p></CardContent
            ></Card
          >
        </div>
        <div
          v-if="totalPaginas > 1"
          class="flex items-center justify-between border-t border-border p-4"
        >
          <span class="text-sm text-muted-foreground"
            >Página {{ pagina }} de {{ totalPaginas }}</span
          >
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              title="Página anterior"
              :disabled="pagina === 1 || loading"
              @click="mudarPagina(pagina - 1)"
              ><ChevronLeft class="h-4 w-4" /></Button
            ><Button
              variant="outline"
              size="icon"
              title="Próxima página"
              :disabled="pagina === totalPaginas || loading"
              @click="mudarPagina(pagina + 1)"
              ><ChevronRight class="h-4 w-4"
            /></Button>
          </div></div></CardContent
    ></Card>
    <Card class="border-border shadow-none"
      ><CardContent class="p-0"
        ><div v-if="loading" class="grid gap-3 p-4 sm:grid-cols-2">
          <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
        </div>
        <EmptyState
          v-else-if="!equipamentos.length"
          title="Nenhum equipamento cadastrado"
          description="Cadastre o primeiro aparelho para acompanhar os atendimentos desse cliente."
          action-label="Novo equipamento"
          @action="abrirNovo" />
        <div v-else class="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card v-for="item in equipamentos" :key="item.id" class="border-border shadow-sm"
            ><CardContent class="p-4"
              ><div class="flex items-start justify-between gap-3">
                <span
                  class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e7eef5] text-[#43627a]"
                  ><Wrench class="h-4 w-4"
                /></span>
                <div class="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar equipamento"
                    @click="abrirEdicao(item)"
                    ><Pencil class="h-4 w-4" /></Button
                  ><Button
                    variant="ghost"
                    size="icon"
                    title="Arquivar equipamento"
                    @click="confirmarExclusao(item)"
                    ><Trash2 class="h-4 w-4 text-destructive"
                  /></Button>
                </div>
              </div>
              <h3 class="mt-4 font-semibold text-primary">
                {{ item.tipo
                }}<span v-if="item.marca || item.modelo">
                  · {{ [item.marca, item.modelo].filter(Boolean).join(' ') }}</span
                >
              </h3>
              <p class="mt-1 text-sm text-muted-foreground">
                Cliente: {{ item.clientes?.nome || 'Não informado' }}
              </p>
              <p
                v-if="item.numero_serie || item.identificacao"
                class="mt-2 text-xs text-muted-foreground"
              >
                {{ item.numero_serie || item.identificacao }}
              </p>
              <Button
                variant="outline"
                size="sm"
                class="mt-4 w-full gap-2"
                @click="abrirHistorico(item)"
                ><ClipboardList class="h-4 w-4" />Ver histórico</Button
              ></CardContent
            ></Card
          >
        </div>
        <div
          v-if="totalPaginas > 1"
          class="flex items-center justify-between border-t border-border p-4"
        >
          <span class="text-sm text-muted-foreground"
            >Página {{ pagina }} de {{ totalPaginas }}</span
          >
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              title="Página anterior"
              :disabled="pagina === 1 || loading"
              @click="mudarPagina(pagina - 1)"
              ><ChevronLeft class="h-4 w-4" /></Button
            ><Button
              variant="outline"
              size="icon"
              title="Próxima página"
              :disabled="pagina === totalPaginas || loading"
              @click="mudarPagina(pagina + 1)"
              ><ChevronRight class="h-4 w-4"
            /></Button>
          </div></div></CardContent
    ></Card>

    <Modal
      v-model="modalAberto"
      :title="formulario.id ? 'Editar equipamento' : 'Novo equipamento'"
      description="Identifique o aparelho sem armazenar senhas de acesso."
      size="lg"
      ><div class="grid gap-4 sm:grid-cols-2">
        <FormGroup id="equip_cliente" label="Cliente"
          ><Select id="equip_cliente" v-model="formulario.cliente_id" :disabled="carregandoClientes"
            ><option value="">Selecione o cliente</option>
            <option v-for="cliente in clientes" :key="cliente.id" :value="cliente.id">
              {{ cliente.nome }}
            </option></Select
          ></FormGroup
        ><FormGroup id="equip_tipo" label="Tipo"
          ><Input
            id="equip_tipo"
            v-model="formulario.tipo"
            placeholder="Ex.: Notebook" /></FormGroup
        ><FormGroup id="equip_marca" label="Marca"
          ><Input id="equip_marca" v-model="formulario.marca" placeholder="Ex.: Dell" /></FormGroup
        ><FormGroup id="equip_modelo" label="Modelo"
          ><Input
            id="equip_modelo"
            v-model="formulario.modelo"
            placeholder="Ex.: Inspiron 15" /></FormGroup
        ><FormGroup id="equip_serie" label="Número de série"
          ><Input id="equip_serie" v-model="formulario.numero_serie" /></FormGroup
        ><FormGroup id="equip_identificacao" label="Identificação interna"
          ><Input
            id="equip_identificacao"
            v-model="formulario.identificacao"
            placeholder="Ex.: Notebook do escritório" /></FormGroup
        ><FormGroup id="equip_obs" label="Observações" class="sm:col-span-2"
          ><Input
            id="equip_obs"
            v-model="formulario.observacoes"
            placeholder="Cor, acessórios ou características úteis"
        /></FormGroup>
      </div>
      <template #footer
        ><Button variant="outline" :disabled="salvando" @click="modalAberto = false"
          >Cancelar</Button
        ><Button :disabled="salvando" @click="salvar">{{
          salvando ? 'Salvando...' : 'Salvar equipamento'
        }}</Button></template
      ></Modal
    >
    <Modal
      v-model="modalExclusaoAberto"
      title="Arquivar equipamento"
      description="O equipamento deixará de aparecer nas listas, mas seu histórico será preservado."
      ><p class="text-sm text-muted-foreground">Deseja arquivar este equipamento?</p>
      <template #footer
        ><Button variant="outline" :disabled="excluindo" @click="modalExclusaoAberto = false"
          >Cancelar</Button
        ><Button variant="destructive" :disabled="excluindo" @click="excluir">{{
          excluindo ? 'Arquivando...' : 'Arquivar'
        }}</Button></template
      ></Modal
    >
    <Modal
      v-model="historicoAberto"
      title="Histórico de atendimentos"
      :description="`${historicoEquipamento?.tipo || 'Equipamento'} · ${historicoEquipamento?.clientes?.nome || 'Cliente'}`"
      size="lg"
    >
      <div v-if="historicoCarregando" class="space-y-3">
        <Skeleton v-for="item in 3" :key="item" class="h-16 w-full" />
      </div>
      <EmptyState
        v-else-if="!historicoOS.length"
        title="Nenhum atendimento registrado"
        description="As próximas OS vinculadas a este equipamento aparecerão aqui."
      />
      <div v-else class="divide-y divide-border">
        <div v-for="ordem in historicoOS" :key="ordem.id" class="flex items-start gap-3 py-4">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-bold text-primary"
            >#{{ ordem.numero_os }}</span
          >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-medium text-foreground">{{ ordem.descricao_problema }}</p>
              <span class="text-xs text-muted-foreground">{{
                formatarData(ordem.created_at)
              }}</span>
            </div>
            <p class="mt-1 text-xs capitalize text-muted-foreground">
              {{ ordem.status.replace('_', ' ') }} · {{ formatarMoeda(ordem.valor_total) }}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>
