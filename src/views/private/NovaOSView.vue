<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listarClientes } from '@/services/clientesService'
import { listarEquipamentosDoCliente } from '@/services/equipamentosService'
import { criarOrdemServico } from '@/services/ordensServicoService'
import { toast } from '@/composables/useToast'
import PageHeader from '@/components/common/PageHeader.vue'

import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'
import FormGroup from '@/components/ui/FormGroup.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Input from '@/components/ui/Input.vue'

// Novos ícones importados
import { ArrowLeft, Save, Search, X, CircleCheck } from '@lucide/vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const clientes = ref([])
const equipamentos = ref([])
const carregandoClientes = ref(true)
const carregandoEquipamentos = ref(false)
const salvando = ref(false)
const etapaAtual = ref(1)

// Campos do Formulário
const formOS = ref({
  cliente_id: '',
  equipamento_id: '',
  prioridade: 'normal',
  descricao_problema: '',
  data_previsao: '',
})

// ==========================================
// ESTADO DO AUTOCOMPLETAR DE CLIENTES
// ==========================================
const buscaCliente = ref('')
const mostrarDropdown = ref(false)
const clienteSelecionado = ref(null)

// Filtra a lista de clientes baseada no que foi digitado
const clientesFiltradosDropdown = computed(() => {
  if (!buscaCliente.value) return clientes.value
  const termo = buscaCliente.value.toLowerCase()
  return clientes.value.filter(
    (c) => c.nome.toLowerCase().includes(termo) || (c.documento && c.documento.includes(termo)),
  )
})

// Ação de clique na lista
function selecionarCliente(cliente) {
  clienteSelecionado.value = cliente
  formOS.value.cliente_id = cliente.id
  mostrarDropdown.value = false
  buscaCliente.value = '' // limpa o input de busca
  carregarEquipamentos(cliente.id)
}

// Ação para remover o cliente escolhido e buscar outro
function limparCliente() {
  clienteSelecionado.value = null
  formOS.value.cliente_id = ''
  formOS.value.equipamento_id = ''
  equipamentos.value = []
}

function avancarEtapa() {
  if (etapaAtual.value === 1 && !formOS.value.cliente_id) {
    toast.error('Atenção', 'Selecione um cliente para continuar.')
    return
  }
  if (etapaAtual.value === 2 && !formOS.value.descricao_problema.trim()) {
    toast.error('Atenção', 'Descreva o problema para continuar.')
    return
  }
  etapaAtual.value = Math.min(3, etapaAtual.value + 1)
}

function voltarEtapa() {
  etapaAtual.value = Math.max(1, etapaAtual.value - 1)
}

async function carregarEquipamentos(clienteId) {
  equipamentos.value = []
  formOS.value.equipamento_id = ''
  carregandoEquipamentos.value = true
  try {
    equipamentos.value = await listarEquipamentosDoCliente(authStore.empresaId, clienteId)
  } catch (error) {
    toast.error('Equipamentos', 'Não foi possível carregar os equipamentos deste cliente.')
  } finally {
    carregandoEquipamentos.value = false
  }
}

// Um pequeno delay para dar tempo do click registrar na lista antes de sumir com ela
function fecharDropdownAposClick() {
  setTimeout(() => {
    mostrarDropdown.value = false
  }, 200)
}
// ==========================================

async function carregarClientesDropdown() {
  try {
    const resultado = await listarClientes(authStore.empresaId, { porPagina: 1000 })
    clientes.value = resultado.items
    const clienteInicial = clientes.value.find((cliente) => cliente.id === route.query.cliente)
    if (clienteInicial) selecionarCliente(clienteInicial)
  } catch (error) {
    toast.error('Erro', 'Não foi possível carregar a lista de clientes.')
  } finally {
    carregandoClientes.value = false
  }
}

async function salvarNovaOS() {
  if (!formOS.value.cliente_id || !formOS.value.descricao_problema) {
    toast.error('Atenção', 'Selecione um cliente e descreva o problema.')
    return
  }

  salvando.value = true
  try {
    const payload = {
      cliente_id: formOS.value.cliente_id,
      equipamento_id: formOS.value.equipamento_id || null,
      prioridade: formOS.value.prioridade,
      descricao_problema: formOS.value.descricao_problema,
      status: 'aberta', // Nasce como aberta ao invés de rascunho
    }

    if (formOS.value.data_previsao) {
      payload.data_previsao = formOS.value.data_previsao
    }

    const novaOs = await criarOrdemServico(authStore.empresaId, payload)

    toast.success('Sucesso', 'Ordem de Serviço aberta com sucesso!')
    // Redireciona diretamente para a edição da nova OS
    router.push(`/ordens-servico/${novaOs.id}`)
  } catch (error) {
    toast.error('Erro', 'Não foi possível abrir a Ordem de Serviço.')
    console.error(error)
  } finally {
    salvando.value = false
  }
}

onMounted(() => {
  carregarClientesDropdown()
})
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-8">
    <PageHeader
      eyebrow="Novo atendimento"
      title="Abrir uma ordem de serviço"
      description="Registre o pedido do cliente para que a equipe saiba exatamente o que precisa ser feito."
      tip="Selecione o cliente, informe o problema com suas próprias palavras e defina uma previsão realista. Depois de abrir a OS, a equipe poderá registrar diagnóstico, solução e itens."
    >
      <template #actions>
        <Button
          variant="ghost"
          size="icon"
          title="Voltar para ordens de serviço"
          @click="router.push('/ordens-servico')"
          ><ArrowLeft class="h-5 w-5"
        /></Button>
      </template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-3">
      <div
        v-for="etapa in [
          { numero: 1, titulo: 'Cliente', descricao: 'Quem será atendido' },
          { numero: 2, titulo: 'Problema', descricao: 'O que aconteceu' },
          { numero: 3, titulo: 'Prazo', descricao: 'Quando entregar' },
        ]"
        :key="etapa.numero"
        class="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
        :class="
          etapaAtual === etapa.numero
            ? 'border-primary bg-primary text-primary-foreground'
            : etapaAtual > etapa.numero
              ? 'border-[#c8d9ce] bg-[#eef3ee] text-[#376056]'
              : 'border-border bg-surface text-muted-foreground'
        "
      >
        <span
          v-if="etapaAtual > etapa.numero"
          class="flex h-5 w-5 items-center justify-center rounded-full bg-[#d6f36b] text-primary"
          ><CircleCheck class="h-4 w-4"
        /></span>
        <span
          v-else
          class="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs"
          >{{ etapa.numero }}</span
        >
        <span
          ><strong class="block" :class="etapaAtual !== etapa.numero && 'text-foreground'">{{
            etapa.titulo
          }}</strong
          ><span class="text-xs opacity-80">{{ etapa.descricao }}</span></span
        >
      </div>
    </div>

    <Card>
      <CardContent class="space-y-8 p-5 sm:p-7">
        <div v-if="etapaAtual === 1" class="grid grid-cols-1 gap-6">
          <FormGroup id="cliente_id" label="Cliente *">
            <!-- Visualização quando o cliente JÁ FOI selecionado -->
            <div
              v-if="clienteSelecionado"
              class="flex items-center justify-between p-3 border border-border rounded-lg bg-slate-50/50"
            >
              <div class="flex flex-col">
                <span class="font-medium text-sm text-foreground">{{
                  clienteSelecionado.nome
                }}</span>
                <span class="text-xs text-muted-foreground">{{
                  clienteSelecionado.documento || 'Sem documento cadastrado'
                }}</span>
              </div>
              <Button variant="ghost" size="icon" @click="limparCliente" title="Trocar cliente">
                <X class="w-4 h-4 text-slate-500" />
              </Button>
            </div>

            <!-- Visualização de Busca (quando NÃO tem cliente selecionado) -->
            <div v-else class="relative">
              <Search class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                id="cliente_id"
                v-model="buscaCliente"
                class="pl-9"
                placeholder="Digite o nome do cliente..."
                @focus="mostrarDropdown = true"
                @blur="fecharDropdownAposClick"
                autocomplete="off"
                :disabled="carregandoClientes"
              />

              <!-- Lista flutuante de resultados -->
              <div
                v-if="mostrarDropdown"
                class="absolute z-10 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                <div
                  v-if="clientesFiltradosDropdown.length === 0"
                  class="p-3 text-sm text-muted-foreground text-center"
                >
                  Nenhum cliente encontrado.
                </div>
                <div
                  v-else
                  v-for="cliente in clientesFiltradosDropdown"
                  :key="cliente.id"
                  @click="selecionarCliente(cliente)"
                  class="px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col border-b border-border/50 last:border-0"
                >
                  <span class="font-medium text-sm text-foreground">{{ cliente.nome }}</span>
                  <span class="text-xs text-muted-foreground">{{
                    cliente.documento || 'Sem documento'
                  }}</span>
                </div>
              </div>
            </div>
          </FormGroup>

          <FormGroup id="equipamento_id" label="Equipamento (opcional)">
            <Select
              id="equipamento_id"
              v-model="formOS.equipamento_id"
              :disabled="!clienteSelecionado || carregandoEquipamentos"
            >
              <option value="">
                {{
                  !clienteSelecionado
                    ? 'Selecione um cliente primeiro'
                    : carregandoEquipamentos
                      ? 'Carregando equipamentos...'
                      : 'Sem equipamento vinculado'
                }}
              </option>
              <option
                v-for="equipamento in equipamentos"
                :key="equipamento.id"
                :value="equipamento.id"
              >
                {{ equipamento.tipo
                }}{{
                  equipamento.marca || equipamento.modelo
                    ? ` · ${[equipamento.marca, equipamento.modelo].filter(Boolean).join(' ')}`
                    : ''
                }}
              </option>
            </Select>
          </FormGroup>
        </div>

        <div v-if="etapaAtual === 2" class="space-y-6">
          <div class="rounded-lg border border-[#c8d9ce] bg-[#eef3ee] p-4 text-sm text-[#376056]">
            <strong class="block text-primary">Cliente selecionado</strong>
            <span>{{ clienteSelecionado?.nome }}</span>
            <span v-if="clienteSelecionado?.documento"> · {{ clienteSelecionado.documento }}</span>
          </div>
          <FormGroup id="descricao" label="Descrição do Problema Relatado *">
            <Textarea
              id="descricao"
              rows="7"
              v-model="formOS.descricao_problema"
              placeholder="Descreva o que o cliente relatou, o equipamento envolvido e qualquer detalhe importante..."
            />
          </FormGroup>
        </div>

        <div v-if="etapaAtual === 3" class="space-y-6">
          <div class="rounded-lg border border-border bg-surface-muted p-4 text-sm">
            <p class="font-semibold text-primary">Resumo do atendimento</p>
            <p class="mt-2 text-muted-foreground">
              <strong class="text-foreground">Cliente:</strong> {{ clienteSelecionado?.nome }}
            </p>
            <p class="mt-1 whitespace-pre-line text-muted-foreground">
              <strong class="text-foreground">Problema:</strong> {{ formOS.descricao_problema }}
            </p>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormGroup id="prioridade" label="Prioridade">
              <Select id="prioridade" v-model="formOS.prioridade">
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </Select>
            </FormGroup>

            <FormGroup id="previsao" label="Previsão de Entrega">
              <Input id="previsao" type="date" v-model="formOS.data_previsao" />
            </FormGroup>
          </div>
        </div>

        <div
          class="flex flex-col-reverse justify-between gap-3 border-t border-border/50 pt-4 sm:flex-row"
        >
          <Button v-if="etapaAtual > 1" variant="outline" @click="voltarEtapa" :disabled="salvando"
            >Voltar</Button
          >
          <Button
            v-else
            variant="ghost"
            @click="router.push('/ordens-servico')"
            :disabled="salvando"
            >Cancelar</Button
          >
          <Button v-if="etapaAtual < 3" variant="default" class="gap-2" @click="avancarEtapa"
            ><span>Continuar</span><ArrowLeft class="h-4 w-4 rotate-180"
          /></Button>
          <Button v-else variant="default" class="gap-2" @click="salvarNovaOS" :disabled="salvando"
            ><Save class="h-4 w-4" />{{
              salvando ? 'Abrindo OS...' : 'Confirmar e abrir OS'
            }}</Button
          >
        </div>
      </CardContent>
    </Card>
  </div>
</template>
