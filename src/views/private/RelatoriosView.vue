<script setup>
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/composables/useToast';
import { carregarRelatorioOS } from '@/services/relatoriosService';

import PageHeader from '@/components/common/PageHeader.vue';
import Card from '@/components/ui/Card.vue';
import CardContent from '@/components/ui/CardContent.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, RefreshCw, TrendingUp } from '@lucide/vue';

const authStore = useAuthStore();
const loading = ref(true);
const erro = ref('');
const relatorio = ref({ total: 0, porStatus: {}, faturamento: 0, ticketMedio: 0, concluidas: 0, foraDoPrazo: 0 });

function dataFormatada(data) {
    const valor = new Date(data);
    const dois = (numero) => String(numero).padStart(2, '0');
    return `${valor.getFullYear()}-${dois(valor.getMonth() + 1)}-${dois(valor.getDate())}`;
}

const hoje = new Date();
const inicioPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
const dataInicio = ref(dataFormatada(inicioPadrao));
const dataFim = ref(dataFormatada(hoje));

const status = [
    { chave: 'aberta', label: 'Abertas', tone: 'bg-[#fff0e9] text-destructive' },
    { chave: 'em_andamento', label: 'Em andamento', tone: 'bg-[#e7eef5] text-[#43627a]' },
    { chave: 'aguardando_peca', label: 'Aguardando peça', tone: 'bg-[#f0eddf] text-[#87733e]' },
    { chave: 'concluida', label: 'Concluídas', tone: 'bg-[#e8f3e4] text-success' },
    { chave: 'cancelada', label: 'Canceladas', tone: 'bg-surface-muted text-muted-foreground' },
];

const cards = computed(() => [
    { label: 'Ordens no período', value: relatorio.value.total, icon: ClipboardList, tone: 'bg-[#e7eef5] text-[#43627a]' },
    { label: 'Concluídas', value: relatorio.value.concluidas, icon: CheckCircle2, tone: 'bg-[#e8f3e4] text-success' },
    { label: 'Faturamento concluído', value: formatarMoeda(relatorio.value.faturamento), icon: TrendingUp, tone: 'bg-[#d6f36b] text-primary' },
    { label: 'Fora do prazo', value: relatorio.value.foraDoPrazo, icon: AlertTriangle, tone: 'bg-[#fff0e9] text-destructive' },
]);

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

async function carregar() {
    if (!authStore.empresaId) return;
    if (dataInicio.value > dataFim.value) {
        toast.error('Período inválido', 'A data inicial deve ser anterior à data final.');
        return;
    }
    loading.value = true;
    erro.value = '';
    try {
        relatorio.value = await carregarRelatorioOS(authStore.empresaId, { dataInicio: dataInicio.value, dataFim: dataFim.value });
    } catch (error) {
        erro.value = 'Não foi possível carregar o relatório.';
        toast.error('Relatórios', erro.value);
    } finally {
        loading.value = false;
    }
}

watch(() => authStore.empresaId, carregar, { immediate: true });
</script>

<template>
    <div class="space-y-8">
        <PageHeader eyebrow="Visão gerencial" title="Relatórios" description="Entenda o ritmo da operação e encontre pontos que precisam de atenção." tip="Use o período para comparar o volume de atendimentos, o que foi concluído, o faturamento realizado e as ordens que passaram do prazo previsto.">
            <template #actions><Button variant="outline" size="icon" title="Atualizar relatório" :disabled="loading" @click="carregar"><RefreshCw class="h-4 w-4" :class="loading && 'animate-spin'" /></Button></template>
        </PageHeader>

        <Card class="border-border shadow-none"><CardContent class="flex flex-col gap-4 p-4 sm:flex-row sm:items-end"><div class="grid flex-1 gap-4 sm:grid-cols-2"><label class="text-sm font-medium text-foreground">De<input v-model="dataInicio" type="date" class="mt-1 flex h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm" /></label><label class="text-sm font-medium text-foreground">Até<input v-model="dataFim" type="date" class="mt-1 flex h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm" /></label></div><Button class="gap-2" @click="carregar"><BarChart3 class="h-4 w-4" />Atualizar análise</Button></CardContent></Card>

        <div v-if="erro" class="rounded-lg border border-destructive/30 bg-[#fff8f4] px-4 py-3 text-sm text-destructive">{{ erro }}</div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card v-for="card in cards" :key="card.label" class="border-border shadow-none"><CardContent class="flex items-start justify-between p-5"><div><p class="text-sm text-muted-foreground">{{ card.label }}</p><Skeleton v-if="loading" class="mt-3 h-8 w-24" /><p v-else class="mt-2 text-2xl font-bold text-primary">{{ card.value }}</p></div><span :class="['flex h-10 w-10 items-center justify-center rounded-lg', card.tone]"><component :is="card.icon" class="h-5 w-5" /></span></CardContent></Card></div>

        <Card class="border-border shadow-none"><CardContent class="p-5 sm:p-6"><div class="flex items-center justify-between"><div><h2 class="font-semibold text-primary">Distribuição das ordens</h2><p class="mt-1 text-sm text-muted-foreground">Como as OS do período estão distribuídas por status.</p></div><span class="text-sm text-muted-foreground">Ticket médio: {{ formatarMoeda(relatorio.ticketMedio) }}</span></div><div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div v-for="item in status" :key="item.chave" class="rounded-lg p-4" :class="item.tone"><span class="block text-xs font-semibold">{{ item.label }}</span><strong class="mt-2 block text-2xl">{{ relatorio.porStatus[item.chave] || 0 }}</strong></div></div></CardContent></Card>
    </div>
</template>
