<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { buscarResumoCliente } from '@/services/clientesService';
import { toast } from '@/composables/useToast';
import PageHeader from '@/components/common/PageHeader.vue';
import Card from '@/components/ui/Card.vue';
import CardContent from '@/components/ui/CardContent.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { ArrowLeft, ClipboardList, Cpu, Plus } from '@lucide/vue';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const erro = ref('');
const resumo = ref({ cliente: null, equipamentos: [], ordens: [] });

const ordensAbertas = computed(() => resumo.value.ordens.filter((ordem) => !['concluida', 'cancelada'].includes(ordem.status)));

function statusInfo(status) {
    const mapa = { aberta: ['Aberta', 'destructive'], agendada: ['Agendada', 'secondary'], em_andamento: ['Em andamento', 'default'], aguardando_peca: ['Aguardando peça', 'outline'], concluida: ['Concluída', 'success'], cancelada: ['Cancelada', 'destructive'] };
    return mapa[status] || [status, 'outline'];
}

async function carregar() {
    loading.value = true;
    try { resumo.value = await buscarResumoCliente(authStore.empresaId, route.params.id); } catch (error) { erro.value = 'Não foi possível carregar o cliente.'; toast.error('Cliente', erro.value); } finally { loading.value = false; }
}

function novaOS() { router.push({ name: 'nova-os', query: { cliente: resumo.value.cliente?.id } }); }
function novoEquipamento() { router.push({ name: 'equipamentos', query: { novo: '1', cliente: resumo.value.cliente?.id } }); }
function abrirOS(id) { router.push(`/ordens-servico/${id}`); }

onMounted(carregar);
</script>

<template>
  <div v-if="loading" class="space-y-4"><Skeleton class="h-12 w-1/2" /><Skeleton class="h-48 w-full" /></div>
  <div v-else-if="erro" class="rounded-lg border border-destructive/30 bg-[#fff8f4] p-5 text-sm text-destructive">{{ erro }}</div>
  <div v-else class="space-y-8">
    <PageHeader eyebrow="Contexto do cliente" :title="resumo.cliente.nome" :description="`${resumo.cliente.documento || 'Documento não informado'}${resumo.cliente.celular ? ` · ${resumo.cliente.celular}` : ''}`" tip="Este painel reúne tudo que você precisa para atender este cliente: equipamentos, ordens abertas e histórico recente.">
      <template #actions><Button variant="ghost" size="icon" title="Voltar para clientes" @click="router.push('/clientes')"><ArrowLeft class="h-5 w-5" /></Button><Button class="gap-2" @click="novaOS"><Plus class="h-4 w-4" />Nova OS para este cliente</Button></template>
    </PageHeader>
    <div class="grid gap-4 sm:grid-cols-3"><Card class="border-border shadow-none"><CardContent class="p-5"><p class="text-sm text-muted-foreground">OS em aberto</p><strong class="mt-2 block text-2xl text-primary">{{ ordensAbertas.length }}</strong></CardContent></Card><Card class="border-border shadow-none"><CardContent class="p-5"><p class="text-sm text-muted-foreground">Equipamentos</p><strong class="mt-2 block text-2xl text-primary">{{ resumo.equipamentos.length }}</strong></CardContent></Card><Card class="border-border shadow-none"><CardContent class="p-5"><p class="text-sm text-muted-foreground">OS no histórico</p><strong class="mt-2 block text-2xl text-primary">{{ resumo.ordens.length }}</strong></CardContent></Card></div>
    <div class="grid gap-6 lg:grid-cols-2"><Card class="border-border shadow-none"><CardContent class="p-5"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3"><Cpu class="h-5 w-5 text-primary" /><h2 class="font-semibold text-primary">Equipamentos</h2></div><Button variant="outline" size="sm" class="gap-1" @click="novoEquipamento"><Plus class="h-3.5 w-3.5" />Novo</Button></div><EmptyState v-if="!resumo.equipamentos.length" title="Nenhum equipamento" description="Cadastre um equipamento para este cliente." /><div v-else class="mt-5 space-y-3"><div v-for="equipamento in resumo.equipamentos" :key="equipamento.id" class="rounded-lg border border-border p-3"><p class="font-medium text-primary">{{ equipamento.tipo }}{{ equipamento.marca || equipamento.modelo ? ` · ${[equipamento.marca, equipamento.modelo].filter(Boolean).join(' ')}` : '' }}</p><p class="mt-1 text-xs text-muted-foreground">{{ equipamento.numero_serie || equipamento.identificacao || 'Sem identificação adicional' }}</p></div></div></CardContent></Card><Card class="border-border shadow-none"><CardContent class="p-5"><div class="flex items-center gap-3"><ClipboardList class="h-5 w-5 text-primary" /><h2 class="font-semibold text-primary">Ordens de serviço</h2></div><EmptyState v-if="!resumo.ordens.length" title="Nenhuma OS" description="Este cliente ainda não possui ordens de serviço." action-label="Abrir nova OS" @action="novaOS" /><div v-else class="mt-5 divide-y divide-border"><button v-for="ordem in resumo.ordens" :key="ordem.id" class="flex w-full items-center gap-3 py-3 text-left hover:bg-surface-muted" @click="abrirOS(ordem.id)"><span class="text-xs font-bold text-muted-foreground">#{{ ordem.numero_os }}</span><span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ ordem.descricao_problema }}</span><Badge :variant="statusInfo(ordem.status)[1]">{{ statusInfo(ordem.status)[0] }}</Badge></button></div></CardContent></Card></div>
  </div>
</template>
