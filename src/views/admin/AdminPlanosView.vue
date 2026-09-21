<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/services/supabase'
import { toast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

import PageHeader from '@/components/common/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Modal from '@/components/ui/Modal.vue'
import FormGroup from '@/components/ui/FormGroup.vue'
import Input from '@/components/ui/Input.vue'
import { Plus, Edit2, CreditCard } from '@lucide/vue'

const authStore = useAuthStore()
const planos = ref([])
const loading = ref(true)

const isModalOpen = ref(false)
const salvando = ref(false)
const formPlano = ref({
  id: null,
  nome: '',
  periodicidade: 'mensal',
  valor: 0,
  limite_usuarios: null,
  ativo: true,
})

async function carregarPlanos() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('planos')
      .select('*')
      .order('valor', { ascending: true })
    if (error) throw error
    planos.value = data || []
  } catch (error) {
    toast.error('Erro', 'Falha ao carregar planos.')
  } finally {
    loading.value = false
  }
}

function abrirModal(plano = null) {
  if (plano) {
    formPlano.value = { ...plano }
  } else {
    formPlano.value = {
      id: null,
      nome: '',
      periodicidade: 'mensal',
      valor: 0,
      limite_usuarios: 5,
      ativo: true,
    }
  }
  isModalOpen.value = true
}

async function salvarPlano() {
  if (!formPlano.value.nome || formPlano.value.valor < 0) {
    toast.error('Atenção', 'Preencha o nome e um valor válido.')
    return
  }
  salvando.value = true
  try {
    const payload = {
      nome: formPlano.value.nome,
      periodicidade: formPlano.value.periodicidade,
      valor: formPlano.value.valor,
      limite_usuarios: formPlano.value.limite_usuarios,
      ativo: formPlano.value.ativo,
    }

    if (formPlano.value.id) {
      await supabase.from('planos').update(payload).eq('id', formPlano.value.id)
      toast.success('Sucesso', 'Plano atualizado!')
    } else {
      await supabase.from('planos').insert(payload)
      toast.success('Sucesso', 'Novo plano criado!')
    }

    isModalOpen.value = false
    await carregarPlanos()
  } catch (error) {
    toast.error('Erro', 'Não foi possível salvar o plano.')
  } finally {
    salvando.value = false
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

onMounted(() => {
  carregarPlanos()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      eyebrow="Gestão SaaS"
      title="Planos de Assinatura"
      description="Gerencie os pacotes comerciais disponíveis para as assistências."
    >
      <template #actions>
        <Button class="gap-2" @click="abrirModal(null)">
          <Plus class="w-4 h-4" /> Novo Plano
        </Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card v-for="plano in planos" :key="plano.id" class="border-border">
        <CardContent class="p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-2">
              <CreditCard class="w-5 h-5 text-primary" />
              <h3 class="font-bold text-lg">{{ plano.nome }}</h3>
            </div>
            <Badge :variant="plano.ativo ? 'success' : 'outline'">{{
              plano.ativo ? 'Ativo' : 'Inativo'
            }}</Badge>
          </div>

          <div class="my-6">
            <span class="text-3xl font-bold text-primary">{{ formatarMoeda(plano.valor) }}</span>
            <span class="text-muted-foreground text-sm">/{{ plano.periodicidade }}</span>
          </div>

          <ul class="space-y-2 text-sm text-slate-600 mb-6">
            <li>
              • Limite de Usuários: <strong>{{ plano.limite_usuarios || 'Ilimitado' }}</strong>
            </li>
          </ul>

          <Button variant="outline" class="w-full gap-2" @click="abrirModal(plano)">
            <Edit2 class="w-4 h-4" /> Editar
          </Button>
        </CardContent>
      </Card>
    </div>

    <Modal v-model="isModalOpen" :title="formPlano.id ? 'Editar Plano' : 'Novo Plano'">
      <div class="space-y-4">
        <FormGroup id="nome" label="Nome do Plano">
          <Input id="nome" v-model="formPlano.nome" placeholder="Ex: Pro" />
        </FormGroup>

        <div class="grid grid-cols-2 gap-4">
          <FormGroup id="valor" label="Valor (R$)">
            <Input id="valor" type="number" step="0.01" v-model="formPlano.valor" />
          </FormGroup>
          <FormGroup id="periodicidade" label="Ciclo">
            <select
              id="periodicidade"
              v-model="formPlano.periodicidade"
              class="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="mensal">Mensal</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </FormGroup>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <FormGroup id="limite_usuarios" label="Limite de Usuários (Técnicos)">
            <Input
              id="limite_usuarios"
              type="number"
              v-model="formPlano.limite_usuarios"
              placeholder="Vazio = ilimitado"
            />
          </FormGroup>
          <FormGroup id="ativo" label="Status">
            <div class="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                v-model="formPlano.ativo"
                class="w-4 h-4 text-primary"
              />
              <label for="ativo" class="text-sm">Plano Comercializável</label>
            </div>
          </FormGroup>
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="isModalOpen = false" :disabled="salvando">Cancelar</Button>
        <Button @click="salvarPlano" :disabled="salvando">{{
          salvando ? 'Salvando...' : 'Salvar Plano'
        }}</Button>
      </template>
    </Modal>
  </div>
</template>
