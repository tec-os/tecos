<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listarCatalogo } from '@/services/catalogoService'
import { listarMovimentacoesEstoque, registrarMovimentacaoEstoque } from '@/services/estoqueService'
import { toast } from '@/composables/useToast'

import PageHeader from '@/components/common/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Table from '@/components/ui/Table.vue'
import TableHeader from '@/components/ui/TableHeader.vue'
import TableBody from '@/components/ui/TableBody.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableHead from '@/components/ui/TableHead.vue'
import TableCell from '@/components/ui/TableCell.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import FormGroup from '@/components/ui/FormGroup.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

import { Package, Activity, Plus, Search, ArrowRight, ArrowLeft, RotateCcw } from '@lucide/vue'

const authStore = useAuthStore()
const loading = ref(true)
const catalogo = ref([])
const busca = ref('')

// Para visualização de histórico
const isModalHistoricoOpen = ref(false)
const itemSelecionado = ref(null)
const historico = ref([])
const loadingHistorico = ref(false)

// Para nova movimentação
const isModalMovimentacaoOpen = ref(false)
const salvandoMovimentacao = ref(false)
const formMovimentacao = ref({
  tipo: 'entrada',
  quantidade: 1,
  observacoes: '',
})

const itensEstoque = computed(() => {
  return catalogo.value.filter(
    (item) => item.controlar_estoque && item.nome.toLowerCase().includes(busca.value.toLowerCase()),
  )
})

async function carregarDados() {
  loading.value = true
  try {
    catalogo.value = await listarCatalogo(authStore.empresaId)
  } catch (error) {
    toast.error('Erro', 'Não foi possível carregar o estoque.')
  } finally {
    loading.value = false
  }
}

async function abrirHistorico(item) {
  itemSelecionado.value = item
  isModalHistoricoOpen.value = true
  loadingHistorico.value = true
  try {
    historico.value = await listarMovimentacoesEstoque(authStore.empresaId, item.id)
  } catch (error) {
    toast.error('Erro', 'Não foi possível carregar o histórico.')
  } finally {
    loadingHistorico.value = false
  }
}

function abrirNovaMovimentacao(item) {
  itemSelecionado.value = item
  formMovimentacao.value = { tipo: 'entrada', quantidade: 1, observacoes: '' }
  isModalMovimentacaoOpen.value = true
}

async function salvarMovimentacao() {
  if (formMovimentacao.value.quantidade <= 0) {
    toast.error('Atenção', 'A quantidade deve ser maior que zero.')
    return
  }
  salvandoMovimentacao.value = true
  try {
    await registrarMovimentacaoEstoque(authStore.empresaId, {
      catalogo_item_id: itemSelecionado.value.id,
      tipo: formMovimentacao.value.tipo,
      quantidade: Number(formMovimentacao.value.quantidade),
      observacoes: formMovimentacao.value.observacoes,
      usuario_id: authStore.user.id,
    })
    toast.success('Sucesso', 'Movimentação registrada com sucesso!')
    isModalMovimentacaoOpen.value = false
    await carregarDados()
    if (isModalHistoricoOpen.value) {
      await abrirHistorico(itemSelecionado.value)
    }
  } catch (error) {
    toast.error('Erro', 'Não foi possível registrar a movimentação.')
  } finally {
    salvandoMovimentacao.value = false
  }
}

function formatarData(data) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(data),
  )
}

function formatarTipo(tipo) {
  const tipos = {
    entrada: { label: 'Entrada', variant: 'success', icon: ArrowRight },
    saida: { label: 'Saída', variant: 'warning', icon: ArrowLeft },
    consumo_os: { label: 'Consumo (OS)', variant: 'secondary', icon: Package },
    estorno_os: { label: 'Estorno (OS)', variant: 'default', icon: RotateCcw },
    ajuste: { label: 'Ajuste', variant: 'outline', icon: Activity },
  }
  return tipos[tipo] || { label: tipo, variant: 'default', icon: Activity }
}

onMounted(() => {
  carregarDados()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      eyebrow="Operação padronizada"
      title="Estoque de Materiais"
      :description="
        authStore.userProfile?.perfil === 'tecnico'
          ? 'Consulte a quantidade e disponibilidade de peças e produtos.'
          : 'Controle a quantidade de peças e produtos disponíveis.'
      "
    >
      <template #actions>
        <div class="relative w-full sm:w-64">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input v-model="busca" placeholder="Buscar no estoque..." class="pl-9" />
        </div>
      </template>
    </PageHeader>

    <Card>
      <CardContent class="p-0">
        <Table v-if="!loading && itensEstoque.length > 0">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead class="text-right">Estoque Atual</TableHead>
              <TableHead class="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in itensEstoque" :key="item.id">
              <TableCell class="font-medium">{{ item.nome }}</TableCell>
              <TableCell>
                <Badge variant="outline">{{
                  item.tipo === 'material' ? 'Peça/Material' : 'Serviço'
                }}</Badge>
              </TableCell>
              <TableCell class="text-right">
                <Badge
                  :variant="
                    item.estoque_atual > 0
                      ? 'success'
                      : item.estoque_atual < 0
                        ? 'destructive'
                        : 'secondary'
                  "
                  class="text-base px-3 py-1"
                >
                  {{ item.estoque_atual }} un.
                </Badge>
              </TableCell>
              <TableCell class="text-right space-x-2">
                <Button variant="ghost" size="sm" @click="abrirHistorico(item)">
                  <Activity class="w-4 h-4 mr-2" />
                  Histórico
                </Button>
                <Button variant="outline" size="sm" @click="abrirNovaMovimentacao(item)">
                  <Plus class="w-4 h-4 mr-2" />
                  Movimentar
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div v-else-if="loading" class="p-6 space-y-4">
          <Skeleton class="h-12 w-full" v-for="i in 3" :key="i" />
        </div>

        <EmptyState
          v-else
          icon="Package"
          title="Nenhum item controlado"
          description="Para ver um item aqui, vá até o Catálogo, edite um material e marque a opção 'Controlar Estoque'."
        />
      </CardContent>
    </Card>

    <!-- Modal Nova Movimentação -->
    <Modal
      v-model="isModalMovimentacaoOpen"
      :title="`Movimentar: ${itemSelecionado?.nome}`"
      description="Registre uma entrada de nota ou saída manual de peças."
      size="md"
    >
      <div class="space-y-4 py-4">
        <FormGroup id="mov_tipo" label="Tipo de Movimentação">
          <Select id="mov_tipo" v-model="formMovimentacao.tipo">
            <option value="entrada">Entrada (Compra/Reposição)</option>
            <option value="saida">Saída (Perda/Devolução)</option>
            <option value="ajuste">Ajuste de Saldo</option>
          </Select>
        </FormGroup>

        <FormGroup id="mov_qtd" label="Quantidade">
          <Input id="mov_qtd" type="number" min="1" v-model="formMovimentacao.quantidade" />
        </FormGroup>

        <FormGroup id="mov_obs" label="Observações (Opcional)">
          <Input
            id="mov_obs"
            v-model="formMovimentacao.observacoes"
            placeholder="Ex: NF 1234, Peça com defeito..."
          />
        </FormGroup>
      </div>
      <template #footer>
        <Button
          variant="ghost"
          @click="isModalMovimentacaoOpen = false"
          :disabled="salvandoMovimentacao"
          >Cancelar</Button
        >
        <Button variant="default" @click="salvarMovimentacao" :disabled="salvandoMovimentacao">
          {{ salvandoMovimentacao ? 'Salvando...' : 'Confirmar' }}
        </Button>
      </template>
    </Modal>

    <!-- Modal Histórico -->
    <Modal
      v-model="isModalHistoricoOpen"
      :title="`Kardex: ${itemSelecionado?.nome}`"
      description="Histórico de movimentações deste item."
      size="lg"
    >
      <div class="py-4">
        <Table v-if="!loadingHistorico && historico.length > 0">
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead class="text-right">Qtd.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="mov in historico" :key="mov.id">
              <TableCell class="text-xs whitespace-nowrap">{{
                formatarData(mov.created_at)
              }}</TableCell>
              <TableCell>
                <Badge :variant="formatarTipo(mov.tipo).variant" class="gap-1">
                  <component :is="formatarTipo(mov.tipo).icon" class="w-3 h-3" />
                  {{ formatarTipo(mov.tipo).label }}
                </Badge>
              </TableCell>
              <TableCell class="text-sm truncate max-w-[100px]">{{
                mov.usuarios?.nome || '-'
              }}</TableCell>
              <TableCell class="text-sm truncate max-w-[200px]" :title="mov.observacoes">
                {{ mov.observacoes || (mov.os_id ? 'OS vinculada' : '-') }}
              </TableCell>
              <TableCell class="text-right font-bold text-sm">
                {{ mov.quantidade }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div v-else-if="loadingHistorico" class="space-y-4">
          <Skeleton class="h-8 w-full" v-for="i in 3" :key="i" />
        </div>

        <div v-else class="text-center py-8 text-muted-foreground">
          <Activity class="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Nenhuma movimentação registrada.</p>
        </div>
      </div>
      <template #footer>
        <Button variant="default" @click="isModalHistoricoOpen = false">Fechar</Button>
      </template>
    </Modal>
  </div>
</template>
