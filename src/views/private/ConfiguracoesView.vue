<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/services/supabase'
import { toast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { buscarAssinaturaEmpresa } from '@/services/assinaturasService'
import PageHeader from '@/components/common/PageHeader.vue'

import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'
import FormGroup from '@/components/ui/FormGroup.vue'
import Input from '@/components/ui/Input.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Tabs from '@/components/ui/Tabs.vue'
import TabsList from '@/components/ui/TabsList.vue'
import TabsTrigger from '@/components/ui/TabsTrigger.vue'
import TabsContent from '@/components/ui/TabsContent.vue'
import Badge from '@/components/ui/Badge.vue'

import {
  Building,
  Save,
  User,
  CreditCard,
  ExternalLink,
  Calendar,
  CheckCircle2,
  DatabaseBackup,
  Download,
  Loader2,
} from '@lucide/vue'
import { executarFluxoBackupCompleto } from '@/services/backupService'

const authStore = useAuthStore()
const isGerente = computed(() => ['gerente', 'dono'].includes(authStore.userProfile?.perfil))

// Controle de estado
const abaAtual = ref('perfil') // Todos começam na aba perfil
const loadingEmpresa = ref(false)
const loadingAssinatura = ref(false)
const salvandoEmpresa = ref(false)
const salvandoPerfil = ref(false)

const assinatura = ref(null)

// Dados do formulário
const formPerfil = ref({
  nome: '',
})

const formEmpresa = ref({
  id: null,
  nome_fantasia: '',
  razao_social: '',
  documento: '',
  telefone: '',
  email: '',
})

// Inicializa os dados
async function carregarDados() {
  // 1. Carrega Perfil (Já temos no Store!)
  formPerfil.value.nome = authStore.userProfile?.nome || ''

  // 2. Carrega Empresa (Apenas se for gerente)
  if (isGerente.value) {
    loadingEmpresa.value = true
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, razao_social, documento, telefone, email')
        .eq('id', authStore.userProfile.empresa_id)
        .single()

      if (error) throw error

      if (data) {
        formEmpresa.value = {
          id: data.id,
          nome_fantasia: data.nome_fantasia || '',
          razao_social: data.razao_social || '',
          documento: data.documento || '',
          telefone: data.telefone || '',
          email: data.email || '',
        }
      }
    } catch (error) {
      toast.error('Erro', 'Não foi possível carregar os dados da empresa.')
    } finally {
      loadingEmpresa.value = false
    }

    // 3. Carrega Assinatura (Apenas Gerentes/Donos)
    loadingAssinatura.value = true
    try {
      assinatura.value = await buscarAssinaturaEmpresa(authStore.userProfile.empresa_id)
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error)
    } finally {
      loadingAssinatura.value = false
    }
  }
}

// Salva o Perfil na tabela 'usuarios'
async function salvarPerfil() {
  if (!formPerfil.value.nome) {
    toast.error('Atenção', 'O nome não pode ficar vazio.')
    return
  }

  salvandoPerfil.value = true
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .update({ nome: formPerfil.value.nome })
      .eq('id', authStore.user.id)
      .select() // <-- Adicionamos o select() aqui para forçar o retorno da linha!

    if (error) throw error

    // Se a resposta vier vazia, o RLS bloqueou a alteração
    if (!data || data.length === 0) {
      throw new Error('Alteração bloqueada pelo banco de dados (RLS).')
    }

    // Atualiza o store em tempo real para refletir no Navbar
    authStore.userProfile.nome = formPerfil.value.nome

    toast.success('Sucesso', 'Seu perfil foi atualizado!')
  } catch (error) {
    console.error('Erro ao salvar perfil:', error)
    toast.error('Erro', error.message || 'Não foi possível atualizar o perfil.')
  } finally {
    salvandoPerfil.value = false
  }
}

// Salva a Empresa (Mantém a lógica intacta)
async function salvarEmpresa() {
  salvandoEmpresa.value = true
  try {
    const { error } = await supabase
      .from('empresas')
      .update({
        nome_fantasia: formEmpresa.value.nome_fantasia,
        razao_social: formEmpresa.value.razao_social,
        documento: formEmpresa.value.documento,
        telefone: formEmpresa.value.telefone,
        email: formEmpresa.value.email,
      })
      .eq('id', formEmpresa.value.id)

    if (error) throw error
    toast.success('Sucesso', 'Configurações da empresa salvas!')
  } catch (error) {
    console.error(error)
    toast.error('Erro', 'Não foi possível salvar os dados.')
  } finally {
    salvandoEmpresa.value = false
  }
}

const exportandoBackup = ref(false)

async function baixarBackup() {
  exportandoBackup.value = true
  try {
    await executarFluxoBackupCompleto(authStore.empresaId)

    // Atualiza o estado local para sumir o aviso
    if (authStore.userProfile && authStore.userProfile.empresas) {
      authStore.userProfile.empresas.ultimo_backup = new Date().toISOString()
    }

    toast.success('Backup Concluído', 'O arquivo JSON foi baixado para o seu computador.')
  } catch (error) {
    toast.error('Erro no Backup', 'Não foi possível gerar o arquivo agora.')
  } finally {
    exportandoBackup.value = false
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

function formatarData(dataISO) {
  if (!dataISO) return '-'
  // ajusta fuso se vier com time, senao deixa date
  return new Date(dataISO).toLocaleDateString('pt-BR')
}

function statusAssinaturaVariant(status) {
  const mapa = {
    teste: 'default',
    ativa: 'success',
    atrasada: 'destructive',
    cancelada: 'outline',
  }
  return mapa[status] || 'outline'
}

function abrirPagamento(url) {
  if (url) {
    window.open(url, '_blank')
  } else {
    toast.error('Indisponível', 'Nenhum link de pagamento gerado.')
  }
}

onMounted(() => {
  // Aguarda o store estar pronto
  if (authStore.userProfile) {
    carregarDados()
  } else {
    setTimeout(carregarDados, 500)
  }
})
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <PageHeader
      eyebrow="Preferências da conta"
      title="Configurações"
      description="Atualize seus dados pessoais e, se você for gerente, os dados da empresa."
      tip="Use esta seção para manter seu nome e os dados cadastrais da empresa atualizados. As opções disponíveis dependem do seu perfil de acesso."
    />

    <Tabs v-model="abaAtual" class="w-full">
      <TabsList
        class="flex w-full justify-start gap-1 overflow-x-auto overflow-y-hidden custom-scrollbar mb-6"
      >
        <TabsTrigger value="perfil" class="gap-2">
          <User class="w-4 h-4" /> Meu Perfil
        </TabsTrigger>
        <!-- Esconde a aba da empresa se não for gerente -->
        <TabsTrigger v-if="isGerente" value="empresa" class="gap-2">
          <Building class="w-4 h-4" /> Dados da Loja
        </TabsTrigger>
        <TabsTrigger v-if="isGerente" value="assinatura" class="gap-2">
          <CreditCard class="w-4 h-4" /> Assinatura e Planos
        </TabsTrigger>
        <TabsTrigger v-if="isGerente" value="backup" class="gap-2">
          <DatabaseBackup class="w-4 h-4" /> Exportação e Backup
        </TabsTrigger>
      </TabsList>

      <!-- ABA 1: MEU PERFIL -->
      <TabsContent value="perfil">
        <Card>
          <CardContent class="p-6">
            <div class="space-y-6">
              <div class="flex items-center gap-2 pb-4 border-b border-border">
                <h2 class="text-lg font-semibold">Informações Pessoais</h2>
              </div>

              <div class="grid grid-cols-1 gap-6 max-w-md">
                <FormGroup id="nome_usuario" label="Seu Nome de Exibição">
                  <Input
                    id="nome_usuario"
                    v-model="formPerfil.nome"
                    placeholder="Digite seu nome"
                  />
                </FormGroup>

                <!-- E-mail desabilitado pois precisaria mudar no auth.users do Supabase também -->
                <FormGroup id="email_usuario" label="E-mail de Acesso">
                  <Input
                    id="email_usuario"
                    :model-value="authStore.user?.email"
                    disabled
                    class="bg-slate-50"
                  />
                  <p class="text-xs text-muted-foreground mt-1">
                    O e-mail de acesso não pode ser alterado por aqui.
                  </p>
                </FormGroup>
              </div>

              <div class="pt-4 border-t border-border flex justify-end">
                <Button
                  variant="default"
                  class="gap-2"
                  @click="salvarPerfil"
                  :disabled="salvandoPerfil"
                >
                  <Save class="w-4 h-4" />
                  {{ salvandoPerfil ? 'Salvando...' : 'Salvar Perfil' }}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- ABA 2: EMPRESA (SÓ PARA GERENTES) -->
      <TabsContent v-if="isGerente" value="empresa">
        <Card>
          <CardContent class="p-6">
            <div v-if="loadingEmpresa" class="space-y-4">
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-10 w-full" />
            </div>

            <div v-else class="space-y-6">
              <div class="flex items-center gap-2 pb-4 border-b border-border">
                <h2 class="text-lg font-semibold">Dados Cadastrais da Loja</h2>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup id="nome_fantasia" label="Nome Fantasia *">
                  <Input
                    id="nome_fantasia"
                    v-model="formEmpresa.nome_fantasia"
                    placeholder="Nome da sua loja"
                  />
                </FormGroup>

                <FormGroup id="razao_social" label="Razão Social">
                  <Input
                    id="razao_social"
                    v-model="formEmpresa.razao_social"
                    placeholder="Razão Social LTDA"
                  />
                </FormGroup>

                <FormGroup id="documento" label="CNPJ / CPF">
                  <Input
                    id="documento"
                    v-model="formEmpresa.documento"
                    placeholder="00.000.000/0001-00"
                  />
                </FormGroup>

                <FormGroup id="telefone" label="Telefone / WhatsApp">
                  <Input
                    id="telefone"
                    v-model="formEmpresa.telefone"
                    placeholder="(00) 00000-0000"
                  />
                </FormGroup>

                <FormGroup id="email" label="E-mail de Contato" class="md:col-span-2">
                  <Input
                    id="email"
                    type="email"
                    v-model="formEmpresa.email"
                    placeholder="contato@empresa.com"
                  />
                </FormGroup>
              </div>

              <div class="pt-4 border-t border-border flex justify-end">
                <Button
                  variant="default"
                  class="gap-2"
                  @click="salvarEmpresa"
                  :disabled="salvandoEmpresa"
                >
                  <Save class="w-4 h-4" />
                  {{ salvandoEmpresa ? 'Salvando...' : 'Salvar Alterações' }}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- ABA 3: ASSINATURA (SÓ PARA GERENTES) -->
      <TabsContent v-if="isGerente" value="assinatura">
        <Card>
          <CardContent class="p-6">
            <div v-if="loadingAssinatura" class="space-y-4">
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-40 w-full" />
            </div>

            <div
              v-else-if="!assinatura"
              class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg"
            >
              <CreditCard class="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p>Nenhuma assinatura localizada para esta loja.</p>
              <p class="text-sm mt-1">Entre em contato com o suporte para verificar sua conta.</p>
            </div>

            <div v-else class="space-y-6">
              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border"
              >
                <div>
                  <h2 class="text-lg font-semibold flex items-center gap-2">
                    Seu Plano Atual
                    <Badge class="uppercase" :variant="statusAssinaturaVariant(assinatura.status)">
                      {{ assinatura.status }}
                    </Badge>
                  </h2>
                  <p class="text-sm text-muted-foreground mt-1">
                    Gerencie os limites e pagamentos do seu sistema.
                  </p>
                </div>
                <Button
                  v-if="
                    assinatura.url_pagamento &&
                    (assinatura.status === 'ativa' || assinatura.status === 'atrasada')
                  "
                  @click="abrirPagamento(assinatura.url_pagamento)"
                  class="gap-2 shrink-0 bg-green-600 hover:bg-green-700 text-white"
                >
                  Pagar Mensalidade <ExternalLink class="h-4 w-4" />
                </Button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Detalhes do Plano -->
                <div class="p-5 bg-surface-muted rounded-lg border border-border">
                  <div class="flex items-center gap-3 mb-4">
                    <div
                      class="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center"
                    >
                      <CheckCircle2 class="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 class="font-bold text-lg text-primary">
                        {{ assinatura.planos?.nome || 'Plano Desconhecido' }}
                      </h3>
                      <p class="text-sm font-medium text-muted-foreground uppercase">
                        {{ assinatura.planos?.periodicidade || 'Mensal' }}
                      </p>
                    </div>
                  </div>
                  <div class="mt-4 pt-4 border-t border-border/50">
                    <p class="text-2xl font-black text-foreground">
                      {{ formatarMoeda(assinatura.planos?.valor) }}
                      <span class="text-sm font-normal text-muted-foreground">/ciclo</span>
                    </p>
                  </div>
                  <div class="mt-4 space-y-2">
                    <p class="text-sm flex justify-between">
                      <span class="text-muted-foreground">Limite de usuários:</span>
                      <span class="font-bold text-foreground"
                        >{{ assinatura.planos?.limite_usuarios || 'Ilimitado' }} usuários</span
                      >
                    </p>
                  </div>
                </div>

                <!-- Detalhes do Ciclo -->
                <div
                  class="p-5 bg-surface-muted rounded-lg border border-border flex flex-col justify-center"
                >
                  <div class="flex items-center gap-3 mb-4">
                    <div
                      class="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center"
                    >
                      <Calendar class="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 class="font-bold text-lg text-foreground">Próximo Vencimento</h3>
                      <p class="text-sm text-muted-foreground">Ciclo de faturamento</p>
                    </div>
                  </div>
                  <div class="mt-4 pt-4 border-t border-border/50">
                    <p
                      class="text-2xl font-black"
                      :class="
                        assinatura.status === 'atrasada' ? 'text-destructive' : 'text-foreground'
                      "
                    >
                      {{ formatarData(assinatura.proximo_vencimento) }}
                    </p>
                    <p
                      v-if="assinatura.status === 'atrasada'"
                      class="text-sm text-destructive font-medium mt-1"
                    >
                      Sua fatura está atrasada!
                    </p>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex justify-center pt-4 border-t border-border">
                <p class="text-sm text-muted-foreground">
                  Precisa mudar de plano ou aumentar seus limites?
                  <a href="#" class="text-primary hover:underline font-medium"
                    >Fale com o suporte.</a
                  >
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- ABA 4: EXPORTAÇÃO E BACKUP -->
      <TabsContent v-if="isGerente" value="backup">
        <Card>
          <CardContent class="p-6">
            <div class="space-y-6">
              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border"
              >
                <div>
                  <h2 class="text-lg font-semibold flex items-center gap-2">Backup de Segurança</h2>
                  <p class="text-sm text-muted-foreground mt-1">
                    Baixe uma cópia completa dos dados da sua empresa.
                  </p>
                </div>
              </div>

              <div class="p-5 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 class="font-bold text-orange-800 mb-2">Importante sobre a Recuperação</h3>
                <p class="text-sm text-orange-700 leading-relaxed">
                  Ao gerar este backup, você receberá um arquivo `.json` contendo todos os seus
                  clientes, equipamentos, ordens de serviço e movimentações. Guarde este arquivo em
                  um local seguro (como um Pendrive ou Google Drive).
                  <br /><br />
                  <strong>Para restaurar um backup no futuro:</strong> Você deverá entrar em contato
                  com o Suporte (na tela de Novidades & Suporte), abrir um chamado e enviar o seu
                  arquivo de backup para que o Administrador Global realize a restauração no
                  sistema.
                </p>
              </div>

              <div
                class="flex flex-col sm:flex-row items-center gap-4 justify-between p-5 bg-surface-muted rounded-lg border border-border"
              >
                <div>
                  <p class="font-medium text-foreground">Gerar Backup Completo (.json)</p>
                  <p class="text-sm text-muted-foreground mt-1">
                    Último backup:
                    {{
                      authStore.userProfile?.empresas?.ultimo_backup
                        ? formatarData(authStore.userProfile.empresas.ultimo_backup)
                        : 'Nunca realizado'
                    }}
                  </p>
                </div>

                <Button
                  @click="baixarBackup"
                  :disabled="exportandoBackup"
                  class="w-full sm:w-auto bg-primary hover:bg-[#26564d] text-white flex items-center gap-2"
                >
                  <Loader2 v-if="exportandoBackup" class="w-4 h-4 animate-spin" />
                  <Download v-else class="w-4 h-4" />
                  {{ exportandoBackup ? 'Processando...' : 'Fazer Download' }}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
