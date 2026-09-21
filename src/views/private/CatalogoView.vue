<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import {
  arquivarItemCatalogo,
  atualizarItemCatalogo,
  criarItemCatalogo,
  listarCatalogo,
} from '@/services/catalogoService'
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
import Badge from '@/components/ui/Badge.vue'
import { Pencil, Plus, Search, Trash2, Wrench } from '@lucide/vue'

const authStore = useAuthStore()
const itens = ref([])
const loading = ref(true)
const erro = ref('')
const busca = ref('')
const tipoFiltro = ref('')
const modalAberto = ref(false)
const modalExclusaoAberto = ref(false)
const salvando = ref(false)
const excluindo = ref(false)
const selecionado = ref(null)
const formulario = ref({
  id: null,
  tipo: 'servico',
  nome: '',
  descricao: '',
  custo: 0,
  preco: 0,
  controlar_estoque: false,
})

const tipoLabel = computed(() => ({ servico: 'Serviço', material: 'Material' }))
function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}
function novo() {
  formulario.value = {
    id: null,
    tipo: 'servico',
    nome: '',
    descricao: '',
    custo: 0,
    preco: 0,
    controlar_estoque: false,
  }
  modalAberto.value = true
}
function editar(item) {
  formulario.value = { ...item }
  modalAberto.value = true
}
function confirmar(item) {
  selecionado.value = item
  modalExclusaoAberto.value = true
}
async function carregar() {
  if (!authStore.empresaId) return
  loading.value = true
  try {
    itens.value = await listarCatalogo(authStore.empresaId, {
      busca: busca.value,
      tipo: tipoFiltro.value,
    })
  } catch (error) {
    erro.value = 'Não foi possível carregar o catálogo.'
    toast.error('Catálogo', erro.value)
  } finally {
    loading.value = false
  }
}
async function salvar() {
  if (!formulario.value.nome.trim() || Number(formulario.value.preco) < 0) {
    toast.error('Atenção', 'Informe um nome e um preço válido.')
    return
  }
  salvando.value = true
  const payload = {
    tipo: formulario.value.tipo,
    nome: formulario.value.nome.trim(),
    descricao: formulario.value.descricao.trim() || null,
    custo: Number(formulario.value.custo) || 0,
    preco: Number(formulario.value.preco) || 0,
    controlar_estoque: formulario.value.controlar_estoque || false,
  }
  try {
    if (formulario.value.id) {
      await atualizarItemCatalogo(formulario.value.id, payload)
      toast.success('Sucesso', 'Item atualizado.')
    } else {
      await criarItemCatalogo(authStore.empresaId, payload)
      toast.success('Sucesso', 'Item adicionado ao catálogo.')
    }
    modalAberto.value = false
    await carregar()
  } catch (error) {
    toast.error('Erro', 'Não foi possível salvar o item.')
  } finally {
    salvando.value = false
  }
}
async function arquivar() {
  if (!selecionado.value) return
  excluindo.value = true
  try {
    await arquivarItemCatalogo(selecionado.value.id)
    modalExclusaoAberto.value = false
    toast.success('Sucesso', 'Item arquivado.')
    await carregar()
  } catch (error) {
    toast.error('Erro', 'Não foi possível arquivar o item.')
  } finally {
    excluindo.value = false
    selecionado.value = null
  }
}
watch([busca, tipoFiltro], carregar)
watch(() => authStore.empresaId, carregar, { immediate: true })
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      eyebrow="Operação padronizada"
      title="Catálogo"
      :description="
        authStore.userProfile?.perfil === 'tecnico'
          ? 'Consulte os serviços e materiais disponíveis para lançar nas OS.'
          : 'Cadastre serviços e materiais usados com frequência para lançar itens mais rápido nas OS.'
      "
      tip="O catálogo é opcional. Ele serve para evitar digitação repetida; ao escolher um item em uma OS, a descrição e o preço serão sugeridos."
      ><template #actions
        ><Button v-if="authStore.userProfile?.perfil !== 'tecnico'" class="gap-2" @click="novo"
          ><Plus class="h-4 w-4" />Novo item</Button
        ></template
      ></PageHeader
    >
    <Card class="border-border shadow-none"
      ><CardContent class="flex flex-col gap-3 p-4 sm:flex-row"
        ><div class="relative flex-1">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input
            v-model="busca"
            class="pl-9"
            placeholder="Buscar no catálogo"
          />
        </div>
        <Select v-model="tipoFiltro" class="sm:max-w-xs"
          ><option value="">Todos</option>
          <option value="servico">Serviços</option>
          <option value="material">Materiais</option></Select
        ></CardContent
      ></Card
    >
    <Card class="border-border shadow-none"
      ><CardContent class="p-0"
        ><div v-if="loading" class="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton v-for="item in 6" :key="item" class="h-32 w-full" />
        </div>
        <EmptyState
          v-else-if="!itens.length"
          title="Catálogo vazio"
          :description="
            authStore.userProfile?.perfil === 'tecnico'
              ? 'Nenhum item disponível no momento.'
              : 'Cadastre serviços ou materiais para acelerar o lançamento nas OS.'
          "
          :action-label="authStore.userProfile?.perfil !== 'tecnico' ? 'Novo item' : null"
          @action="novo"
        />
        <div v-else class="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card v-for="item in itens" :key="item.id" class="border-border shadow-sm"
            ><CardContent class="p-4"
              ><div class="flex items-start justify-between gap-3">
                <span
                  class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e7eef5] text-[#43627a]"
                  ><Wrench class="h-4 w-4"
                /></span>
                <div v-if="authStore.userProfile?.perfil !== 'tecnico'" class="flex gap-1">
                  <Button variant="ghost" size="icon" title="Editar item" @click="editar(item)"
                    ><Pencil class="h-4 w-4" /></Button
                  ><Button
                    variant="ghost"
                    size="icon"
                    title="Arquivar item"
                    @click="confirmar(item)"
                    ><Trash2 class="h-4 w-4 text-destructive"
                  /></Button>
                </div>
              </div>
              <Badge variant="outline" class="mt-4">{{ tipoLabel[item.tipo] }}</Badge>
              <h3 class="mt-2 font-semibold text-primary">{{ item.nome }}</h3>
              <p v-if="item.descricao" class="mt-1 text-sm text-muted-foreground">
                {{ item.descricao }}
              </p>
              <div class="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-3 text-sm">
                <div>
                  <span class="block text-muted-foreground">Preço</span>
                  <strong class="text-primary">{{ moeda(item.preco) }}</strong>
                </div>
                <div v-if="item.controlar_estoque" class="text-right">
                  <span class="block text-muted-foreground">Estoque</span>
                  <strong :class="item.estoque_atual > 0 ? 'text-emerald-600' : 'text-destructive'"
                    >{{ item.estoque_atual }} un.</strong
                  >
                </div>
              </div></CardContent
            ></Card
          >
        </div></CardContent
      ></Card
    >
    <Modal
      v-model="modalAberto"
      :title="formulario.id ? 'Editar item do catálogo' : 'Novo item do catálogo'"
      description="Cadastre um serviço ou material para reutilizar nas ordens de serviço."
      size="md"
      ><div class="space-y-4">
        <FormGroup id="catalogo_tipo" label="Tipo"
          ><Select id="catalogo_tipo" v-model="formulario.tipo"
            ><option value="servico">Serviço</option>
            <option value="material">Material</option></Select
          ></FormGroup
        ><FormGroup
          v-if="formulario.tipo === 'material'"
          id="catalogo_estoque"
          label="Controle de Estoque"
          ><div class="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="check_estoque"
              v-model="formulario.controlar_estoque"
              class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            /><label for="check_estoque" class="text-sm font-medium"
              >Ativar controle de estoque para esta peça</label
            >
          </div></FormGroup
        ><FormGroup id="catalogo_nome" label="Nome"
          ><Input
            id="catalogo_nome"
            v-model="formulario.nome"
            placeholder="Ex.: Limpeza interna" /></FormGroup
        ><FormGroup id="catalogo_descricao" label="Descrição"
          ><Input
            id="catalogo_descricao"
            v-model="formulario.descricao"
            placeholder="Detalhes opcionais"
        /></FormGroup>
        <div class="grid gap-4 sm:grid-cols-2">
          <FormGroup
            id="catalogo_custo"
            label="Custo interno"
            description="Quanto sua empresa gasta para comprar o material ou realizar o serviço. O cliente não vê este valor."
            ><Input
              id="catalogo_custo"
              v-model="formulario.custo"
              type="number"
              step="0.01"
              min="0" /></FormGroup
          ><FormGroup
            id="catalogo_preco"
            label="Preço sugerido ao cliente"
            description="Valor normalmente cobrado do cliente. Você ainda pode ajustar o preço ao lançar na OS."
            ><Input
              id="catalogo_preco"
              v-model="formulario.preco"
              type="number"
              step="0.01"
              min="0"
          /></FormGroup>
        </div>
      </div>
      <template #footer
        ><Button variant="outline" :disabled="salvando" @click="modalAberto = false"
          >Cancelar</Button
        ><Button :disabled="salvando" @click="salvar">{{
          salvando ? 'Salvando...' : 'Salvar item'
        }}</Button></template
      ></Modal
    >
    <Modal
      v-model="modalExclusaoAberto"
      title="Arquivar item"
      description="O item deixará de aparecer como sugestão nas OS."
      ><p class="text-sm text-muted-foreground">Deseja arquivar “{{ selecionado?.nome }}”?</p>
      <template #footer
        ><Button variant="outline" :disabled="excluindo" @click="modalExclusaoAberto = false"
          >Cancelar</Button
        ><Button variant="destructive" :disabled="excluindo" @click="arquivar">{{
          excluindo ? 'Arquivando...' : 'Arquivar'
        }}</Button></template
      ></Modal
    >
  </div>
</template>
