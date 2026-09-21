<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/services/supabase'
import { toast } from '@/composables/useToast'

import PageHeader from '@/components/common/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import { Bug, CheckCircle2 } from '@lucide/vue'

const bugs = ref([])
const loading = ref(true)

async function carregarBugs() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('plataforma_bugs')
      .select(
        `
                id, titulo, descricao, status, created_at,
                empresas (nome_fantasia, razao_social, telefone),
                usuarios (nome)
            `,
      )
      .order('created_at', { ascending: false })

    if (error) throw error
    bugs.value = data || []
  } catch (error) {
    toast.error('Erro', 'Falha ao carregar os bugs.')
  } finally {
    loading.value = false
  }
}

async function resolverBug(id) {
  try {
    const { error } = await supabase
      .from('plataforma_bugs')
      .update({ status: 'resolvido' })
      .eq('id', id)
    if (error) throw error
    toast.success('Sucesso', 'Bug marcado como resolvido.')
    await carregarBugs()
  } catch (error) {
    toast.error('Erro', 'Não foi possível alterar o status.')
  }
}

function dataApresentavel(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => carregarBugs())
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      eyebrow="Feedback"
      title="Reportes de Bugs"
      description="Acompanhe os problemas enviados pelos gerentes das assistências."
    />

    <div v-if="loading" class="text-center py-10 text-muted-foreground">Carregando reports...</div>
    <div v-else-if="!bugs.length" class="text-center py-10 text-muted-foreground">
      Nenhum bug reportado no momento.
    </div>

    <div v-else class="grid gap-4">
      <Card v-for="bug in bugs" :key="bug.id" class="border-border">
        <CardContent class="p-6">
          <div class="flex justify-between items-start gap-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <Badge :variant="bug.status === 'resolvido' ? 'success' : 'destructive'">
                  {{ bug.status === 'resolvido' ? 'Resolvido' : 'Pendente' }}
                </Badge>
                <span class="text-xs text-muted-foreground">{{
                  dataApresentavel(bug.created_at)
                }}</span>
              </div>
              <h3 class="font-bold text-lg text-foreground mb-1">{{ bug.titulo }}</h3>
              <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ bug.descricao }}</p>

              <div
                class="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-slate-500"
              >
                <span class="font-medium"
                  >Loja:
                  <span class="text-primary">{{
                    bug.empresas?.nome_fantasia || bug.empresas?.razao_social
                  }}</span></span
                >
                <span>Contato: {{ bug.empresas?.telefone || '-' }}</span>
                <span>Reportado por: {{ bug.usuarios?.nome }}</span>
              </div>
            </div>

            <Button
              v-if="bug.status !== 'resolvido'"
              variant="outline"
              size="sm"
              class="shrink-0 gap-2 text-success hover:bg-success hover:text-white"
              @click="resolverBug(bug.id)"
            >
              <CheckCircle2 class="w-4 h-4" /> Marcar Resolvido
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
