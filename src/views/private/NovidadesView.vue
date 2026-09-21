<script setup>
import { ref } from 'vue'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import PageHeader from '@/components/common/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'
import FormGroup from '@/components/ui/FormGroup.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import { Sparkles, Bug, CheckCircle2, Megaphone } from '@lucide/vue'

const authStore = useAuthStore()

// Dados de atualizações hardcoded (Fácil de manter e não pesa o DB)
const versoes = [
  {
    versao: 'v1.1.0',
    data: '15 de Setembro, 2026',
    destaque: true,
    titulo: 'Otimização de Performance e UI Refinada',
    features: [
      'Impressão de Ordem de Serviço (PDF A4) agora disponível direto na OS.',
      'Barra lateral responsiva auto-ocultável no uso por celular.',
      'Nova estrutura de banco de dados super-rápida (Índices aplicados).',
      'Painel do gerente agora traz relatórios financeiros e de tickets.',
      'Correções visuais na tela de Configurações para dispositivos menores.',
    ],
  },
  {
    versao: 'v1.0.5',
    data: '08 de Setembro, 2026',
    destaque: false,
    titulo: 'Controle de Estoque Inteligente',
    features: [
      'Trava de segurança: impossível adicionar peças na OS se não houver saldo no estoque.',
      'O Catálogo unificado foi liberado para técnicos consultarem quantidades.',
      'Gerenciamento de permissões atualizado: Técnicos agora operam apenas em suas respectivas Ordens.',
    ],
  },
]

const formBug = ref({
  titulo: '',
  descricao: '',
})

const enviando = ref(false)
const enviadoSucesso = ref(false)

async function reportarBug() {
  if (!formBug.value.titulo || !formBug.value.descricao) {
    toast.error('Atenção', 'Por favor, preencha o título e a descrição do problema.')
    return
  }

  enviando.value = true
  try {
    const { error } = await supabase.from('plataforma_bugs').insert({
      empresa_id: authStore.empresaId,
      usuario_id: authStore.user.id,
      titulo: formBug.value.titulo,
      descricao: formBug.value.descricao,
      status: 'pendente',
    })

    if (error) throw error

    enviadoSucesso.value = true
    formBug.value.titulo = ''
    formBug.value.descricao = ''
    toast.success('Recebido!', 'Seu reporte foi enviado para a equipe de desenvolvimento.')

    // Esconde a mensagem de sucesso após 5 segundos
    setTimeout(() => {
      enviadoSucesso.value = false
    }, 5000)
  } catch (error) {
    console.error(error)
    toast.error('Erro', 'Não foi possível enviar o reporte agora. Tente novamente mais tarde.')
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="space-y-8 max-w-6xl mx-auto">
    <PageHeader
      eyebrow="Transparência e Suporte"
      title="Novidades do Sistema"
      description="Acompanhe a evolução da plataforma e ajude-nos a melhorar reportando problemas."
    />

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <!-- Coluna Esquerda: Timeline de Novidades -->
      <div class="lg:col-span-3 space-y-6">
        <div class="flex items-center gap-2 pb-4 border-b border-border">
          <Megaphone class="w-5 h-5 text-primary" />
          <h2 class="text-xl font-semibold text-foreground">Registro de Atualizações</h2>
        </div>

        <div class="space-y-6">
          <Card
            v-for="(versao, index) in versoes"
            :key="index"
            :class="
              versao.destaque ? 'border-primary/30 bg-primary/5' : 'border-border shadow-none'
            "
          >
            <CardContent class="p-6">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <span
                    class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                  >
                    {{ versao.versao }}
                  </span>
                  <span class="ml-3 text-sm text-muted-foreground">{{ versao.data }}</span>
                </div>
                <Sparkles v-if="versao.destaque" class="w-5 h-5 text-primary" />
              </div>

              <h3 class="text-lg font-bold text-foreground mb-3">{{ versao.titulo }}</h3>

              <ul class="space-y-2">
                <li
                  v-for="(feat, i) in versao.features"
                  :key="i"
                  class="flex items-start gap-2 text-sm text-slate-700"
                >
                  <CheckCircle2 class="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span>{{ feat }}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Coluna Direita: Formulário de Reportar Bug -->
      <div class="lg:col-span-2">
        <Card class="border-orange-200 bg-orange-50/50 shadow-none sticky top-6">
          <CardContent class="p-6">
            <div class="flex items-center gap-2 mb-2">
              <Bug class="w-5 h-5 text-orange-600" />
              <h2 class="text-lg font-semibold text-orange-900">Encontrou um erro?</h2>
            </div>
            <p class="text-sm text-orange-800 mb-6">
              Se algo não estiver funcionando como deveria, descreva o problema abaixo. Nossa equipe
              técnica vai analisar imediatamente.
            </p>

            <div
              v-if="enviadoSucesso"
              class="bg-success/10 border border-success/30 rounded-lg p-4 text-center mb-6"
            >
              <CheckCircle2 class="w-8 h-8 text-success mx-auto mb-2" />
              <h3 class="font-bold text-success-foreground">Reporte Enviado!</h3>
              <p class="text-sm text-success mt-1">
                Muito obrigado por ajudar a construir um sistema melhor.
              </p>
            </div>

            <div v-else class="space-y-4">
              <FormGroup id="titulo" label="Onde ocorreu o erro? (Resumo)">
                <Input
                  id="titulo"
                  v-model="formBug.titulo"
                  placeholder="Ex: Erro ao salvar cliente novo"
                  class="bg-white"
                />
              </FormGroup>

              <FormGroup id="descricao" label="Passo a passo do problema">
                <Textarea
                  id="descricao"
                  v-model="formBug.descricao"
                  rows="5"
                  placeholder="Explique o que você clicou e o que aconteceu de errado..."
                  class="bg-white"
                />
              </FormGroup>

              <Button
                class="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
                @click="reportarBug"
                :disabled="enviando"
              >
                <Bug class="w-4 h-4" />
                {{ enviando ? 'Enviando...' : 'Reportar para o Suporte' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
